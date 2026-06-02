import { chromium, Browser, Page } from 'playwright'
import type { ProjectFile } from '@/types'
import { spawn } from 'child_process'
import path from 'path'

export interface RouteTestResult {
  url: string
  route: string
  status: 'pass' | 'fail' | 'error'
  screenshot: string | null  // base64
  consoleErrors: string[]
  networkErrors: string[]
  brokenLinks: string[]
  loadTimeMs: number
  hasContent: boolean
  pageTitle: string
}

// Run all route tests in a SEPARATE child process so a Chromium OOM crash
// kills only the worker — never the main Code Genesis server. Yields each
// route result as it arrives so the API can stream them over SSE.
export async function* testRoutesInWorker(
  baseUrl: string,
  routes: string[],
): AsyncGenerator<RouteTestResult> {
  const workerPath = path.join(process.cwd(), 'lib', 'testing', 'browser-worker.js')
  const child = spawn(process.execPath, [workerPath, JSON.stringify({ baseUrl, routes })], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })

  let buffer = ''
  const queue: RouteTestResult[] = []
  let done = false
  let resolveNext: (() => void) | null = null

  const wake = () => { if (resolveNext) { resolveNext(); resolveNext = null } }

  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line)
        if (msg.type === 'route') {
          queue.push({ url: `${baseUrl}${msg.route}`, ...msg })
          wake()
        } else if (msg.type === 'done' || msg.type === 'error') {
          done = true
          wake()
        }
      } catch { /* ignore partial/garbage lines */ }
    }
  })
  child.on('exit', () => { done = true; wake() })
  child.on('error', () => { done = true; wake() })

  while (true) {
    if (queue.length > 0) {
      yield queue.shift() as RouteTestResult
      continue
    }
    if (done) break
    await new Promise<void>((r) => { resolveNext = r })
  }
}

export interface ApiTestResult {
  route: string
  method: string
  status: number
  ok: boolean
  latencyMs: number
  error?: string
}

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Memory-conservative flags — Code Genesis + the generated dev server
        // already share this process, so keep Chromium lean to avoid OOM (SIGKILL).
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-software-rasterizer',
        '--single-process',
        '--js-flags=--max-old-space-size=256',
      ],
    })
  }
  return browserInstance
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {})
    browserInstance = null
  }
}

export async function testRoute(baseUrl: string, route: string): Promise<RouteTestResult> {
  const url = `${baseUrl}${route}`
  const browser = await getBrowser()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  const consoleErrors: string[] = []
  const networkErrors: string[] = []
  const start = Date.now()

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('requestfailed', (req) => {
    const err = req.failure()?.errorText ?? 'unknown'
    networkErrors.push(`${req.method()} ${req.url()} — ${err}`)
  })

  let screenshot: string | null = null
  let hasContent = false
  let pageTitle = ''
  let status: RouteTestResult['status'] = 'pass'

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    if (response && response.status() >= 400) {
      status = 'fail'
    }

    // Wait for content to render
    await page.waitForTimeout(1500)

    pageTitle = await page.title()
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '')
    hasContent = bodyText.trim().length > 50

    // Check for unhandled errors in page content
    const pageSource = await page.content()
    if (pageSource.includes('Application error') || pageSource.includes('Unhandled Runtime Error')) {
      status = 'fail'
      consoleErrors.push('Next.js unhandled runtime error detected')
    }

    // Capture a viewport-only JPEG (much smaller than a full-page PNG — keeps
    // memory low and the base64 payload sent to the vision model manageable).
    const buf = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 55 })
    screenshot = buf.toString('base64')

    // Find broken links
    const links = await page.$$eval('a[href]', (els) =>
      els.map((el) => (el as HTMLAnchorElement).href).filter((h) => h.startsWith('http'))
    )
    const brokenLinks: string[] = []
    // Only check a few links to keep it fast
    for (const link of links.slice(0, 5)) {
      try {
        const r = await page.evaluate(async (url: string) => {
          const res = await fetch(url, { method: 'HEAD' })
          return res.status
        }, link)
        if (r >= 400) brokenLinks.push(link)
      } catch { /* skip */ }
    }

    if (consoleErrors.length > 0 || status === 'fail') {
      status = 'fail'
    }

    return {
      url, route, status, screenshot, consoleErrors, networkErrors,
      brokenLinks, loadTimeMs: Date.now() - start, hasContent, pageTitle,
    }
  } catch (err) {
    return {
      url, route, status: 'error', screenshot, consoleErrors,
      networkErrors: [...networkErrors, String(err)],
      brokenLinks: [], loadTimeMs: Date.now() - start, hasContent: false, pageTitle: '',
    }
  } finally {
    await page.close().catch(() => {})
  }
}

export function discoverRoutes(files: ProjectFile[]): string[] {
  const routes = new Set<string>(['/'])
  for (const file of files) {
    const normalized = file.path.replace(/^\//, '')
    if (normalized.startsWith('app/') && normalized.endsWith('page.tsx')) {
      const route = '/' + normalized
        .replace('app/', '')
        .replace(/\/page\.tsx$/, '')
        .replace(/^page\.tsx$/, '')
      // Skip dynamic routes — can't test without params
      if (!route.includes('[')) routes.add(route || '/')
    }
  }
  return Array.from(routes)
}

export async function testApiRoutes(baseUrl: string, files: ProjectFile[]): Promise<ApiTestResult[]> {
  const apiFiles = files.filter((f) => {
    const p = f.path.replace(/^\//, '')
    return p.startsWith('app/api/') && p.endsWith('route.ts')
  })
  const results: ApiTestResult[] = []

  for (const file of apiFiles) {
    const route = '/' + file.path.replace(/^\//, '').replace('app/', '').replace('/route.ts', '')
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl}${route}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      results.push({ route, method: 'GET', status: res.status, ok: res.status < 500, latencyMs: Date.now() - start })
    } catch (e) {
      results.push({ route, method: 'GET', status: 0, ok: false, latencyMs: Date.now() - start, error: String(e) })
    }
  }
  return results
}

export async function waitForServer(url: string, maxWaitMs = 60000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (res.ok) return true
    } catch { /* keep waiting */ }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}
