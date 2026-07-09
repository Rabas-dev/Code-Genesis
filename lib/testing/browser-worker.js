// Standalone Playwright worker — runs in its OWN process so a Chromium OOM
// crash can never take down the main Code Genesis server.
//
// Usage: node browser-worker.js '<json>'  where json = { baseUrl, routes: string[] }
// Emits NDJSON to stdout, one object per line:
//   { type: 'route', route, status, screenshot, consoleErrors, networkErrors, brokenLinks, loadTimeMs, hasContent, pageTitle }
//   { type: 'done' }

const { chromium } = require('playwright')

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

// Dev-server noise that does NOT mean the app is broken. Without this filter
// every healthy page fails, because Next.js dev mode always logs these.
const IGNORE = [
  /favicon\.ico/i,
  /Download the React DevTools/i,
  /React DevTools/i,
  /\[Fast Refresh\]/i,
  /ResizeObserver loop/i,
  /source ?map/i,
  /Hydration|hydrat/i,
  /_next\/(static|webpack)/i,
  /webpack-hmr|on-demand-entries|__nextjs/i,
  /ERR_ABORTED/i,
  /net::ERR_ABORTED/i,
]
const isNoise = (t) => IGNORE.some((re) => re.test(t || ''))

async function main() {
  let input
  try {
    input = JSON.parse(process.argv[2] || '{}')
  } catch {
    out({ type: 'error', message: 'bad input' })
    process.exit(1)
  }
  const { baseUrl, routes } = input
  if (!baseUrl || !Array.isArray(routes)) {
    out({ type: 'error', message: 'missing baseUrl/routes' })
    process.exit(1)
  }

  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-gpu', '--disable-extensions', '--disable-background-networking',
        '--disable-software-rasterizer', '--js-flags=--max-old-space-size=256',
      ],
    })
  } catch (e) {
    out({ type: 'error', message: 'browser launch failed: ' + e.message })
    process.exit(1)
  }

  for (const route of routes) {
    const url = `${baseUrl}${route}`
    const start = Date.now()
    const consoleErrors = []
    const networkErrors = []
    let page
    try {
      page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
      page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!isNoise(t)) consoleErrors.push(t) } })
      page.on('requestfailed', (r) => { const u = r.url(); if (!isNoise(u)) networkErrors.push(`${r.method()} ${u} — ${r.failure()?.errorText ?? 'failed'}`) })

      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      let status = resp && resp.status() >= 400 ? 'fail' : 'pass'

      await page.waitForTimeout(1500)
      const pageTitle = await page.title().catch(() => '')
      const bodyText = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '')
      const hasContent = bodyText.trim().length > 50

      const src = await page.content().catch(() => '')
      if (src.includes('Application error') || src.includes('Unhandled Runtime Error')) {
        status = 'fail'
        consoleErrors.push('Next.js unhandled runtime error detected')
      }

      let screenshot = null
      try {
        const buf = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 55 })
        screenshot = buf.toString('base64')
      } catch { /* skip */ }

      if (consoleErrors.length > 0) status = 'fail'

      out({
        type: 'route', route, status, screenshot, consoleErrors, networkErrors,
        brokenLinks: [], loadTimeMs: Date.now() - start, hasContent, pageTitle,
      })
    } catch (e) {
      out({
        type: 'route', route, status: 'error', screenshot: null,
        consoleErrors, networkErrors: [...networkErrors, String(e)],
        brokenLinks: [], loadTimeMs: Date.now() - start, hasContent: false, pageTitle: '',
      })
    } finally {
      if (page) await page.close().catch(() => {})
    }
  }

  await browser.close().catch(() => {})
  out({ type: 'done' })
  process.exit(0)
}

main().catch((e) => { out({ type: 'error', message: String(e) }); process.exit(1) })
