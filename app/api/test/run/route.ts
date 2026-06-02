import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { testRoutesInWorker, testApiRoutes, discoverRoutes, waitForServer, closeBrowser } from '@/lib/testing/agent'
import { analyzeScreenshotWithVision } from '@/lib/testing/vision'
import { generateMultipleFixes } from '@/lib/testing/fixer'
import type { TestFinding } from '@/store/useTestStore'
import type { ProjectFile } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const port = parseInt(searchParams.get('port') ?? '3001', 10)

  if (!projectId) {
    return new Response('Missing projectId', { status: 400 })
  }

  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { isClosed = true }
      }

      const log = (message: string) => send({ type: 'log', message })

      try {
        // Load project files from Supabase
        log('Loading project files…')
        const supabase = await createClient()
        const { data: fileRows } = await supabase
          .from('project_files')
          .select('id, path, content, language')
          .eq('project_id', projectId)

        if (!fileRows?.length) {
          send({ type: 'error', message: 'No project files found. Generate the project first.' })
          controller.close()
          return
        }

        const files: ProjectFile[] = fileRows.map((f) => ({
          id: f.id,
          path: f.path,
          content: f.content,
          language: f.language,
        }))

        const { data: projectRow } = await supabase
          .from('projects')
          .select('name, prompt')
          .eq('id', projectId)
          .single()

        const projectContext = projectRow
          ? `${projectRow.name}: ${projectRow.prompt}`
          : 'Generated Next.js app'

        const baseUrl = `http://localhost:${port}`

        // ── PHASE 1: Wait for server ──────────────────────────────────────────
        log(`Waiting for dev server at ${baseUrl}…`)
        const serverReady = await waitForServer(baseUrl, 45000)
        if (!serverReady) {
          send({ type: 'error', message: `Dev server not responding at ${baseUrl}. Click Run first.` })
          controller.close()
          return
        }
        log('✓ Dev server is up')

        // ── PHASE 2: Discover routes ──────────────────────────────────────────
        const MAX_ROUTES = 8 // cap to keep memory/time bounded
        const allRoutes = discoverRoutes(files)
        const routes = allRoutes.slice(0, MAX_ROUTES)
        log(`Discovered ${allRoutes.length} route(s)${allRoutes.length > MAX_ROUTES ? ` (testing first ${MAX_ROUTES})` : ''}: ${routes.join(', ')}`)

        const allFindings: TestFinding[] = []
        let totalScore = 0
        let scoredRoutes = 0

        // ── PHASE 3: Test each route (in an isolated child process) ───────────
        // Announce all routes up front so the UI shows them queued
        routes.forEach((r) => send({ type: 'route-start', route: r }))
        log('Launching browser in isolated process…')

        for await (const result of testRoutesInWorker(baseUrl, routes)) {
          if (isClosed) break
          const route = result.route
          log(`Tested ${route} — ${result.status}`)

          const routeFindings: TestFinding[] = []

          // Console errors → findings
          for (const err of result.consoleErrors) {
            const finding: TestFinding = {
              id: `${route}-console-${Date.now()}`,
              route,
              severity: 'critical',
              category: 'console-error',
              description: err,
              screenshot: result.screenshot ?? undefined,
            }
            routeFindings.push(finding)
            allFindings.push(finding)
            send({ type: 'finding', finding })
          }

          // Network errors → findings
          for (const err of result.networkErrors.slice(0, 3)) {
            const finding: TestFinding = {
              id: `${route}-net-${Date.now()}`,
              route,
              severity: 'warning',
              category: 'network',
              description: err,
            }
            routeFindings.push(finding)
            allFindings.push(finding)
            send({ type: 'finding', finding })
          }

          // Broken links → findings
          for (const link of result.brokenLinks) {
            const finding: TestFinding = {
              id: `${route}-link-${Date.now()}`,
              route,
              severity: 'warning',
              category: 'broken-link',
              description: `Broken link: ${link}`,
            }
            routeFindings.push(finding)
            allFindings.push(finding)
            send({ type: 'finding', finding })
          }

          // No content → finding
          if (!result.hasContent) {
            const finding: TestFinding = {
              id: `${route}-empty-${Date.now()}`,
              route,
              severity: 'critical',
              category: 'visual',
              description: 'Page appears empty — no visible content',
              screenshot: result.screenshot ?? undefined,
            }
            routeFindings.push(finding)
            allFindings.push(finding)
            send({ type: 'finding', finding })
          }

          // Vision analysis if we have a screenshot
          let visualScore = 80
          if (result.screenshot) {
            log(`Running AI vision analysis on ${route}…`)
            try {
              const vision = await analyzeScreenshotWithVision(
                result.screenshot,
                route,
                projectContext,
              )
              visualScore = vision.score
              totalScore += vision.score
              scoredRoutes++

              for (const issue of vision.issues) {
                const finding: TestFinding = {
                  id: `${route}-visual-${Date.now()}-${Math.random()}`,
                  route,
                  severity: issue.severity as TestFinding['severity'],
                  category: 'visual',
                  description: issue.description,
                  screenshot: result.screenshot ?? undefined,
                }
                allFindings.push(finding)
                send({ type: 'finding', finding })
              }
            } catch { /* vision failed — skip */ }
          }

          send({
            type: 'route-result',
            route,
            status: result.status,
            loadTimeMs: result.loadTimeMs,
            screenshot: result.screenshot,
            visualScore,
          })
        }

        // ── PHASE 4: API health check ─────────────────────────────────────────
        log('Checking API routes…')
        const apiResults = await testApiRoutes(baseUrl, files)
        for (const r of apiResults) {
          send({ type: 'api-result', result: r })
          if (!r.ok && r.status !== 401) {
            const finding: TestFinding = {
              id: `api-${r.route}-${Date.now()}`,
              route: r.route,
              severity: r.status >= 500 ? 'critical' : 'warning',
              category: 'api',
              description: `API ${r.route} returned ${r.status || 'network error'}${r.error ? ': ' + r.error : ''}`,
            }
            allFindings.push(finding)
            send({ type: 'finding', finding })
          }
        }

        // ── PHASE 5: Calculate overall score ──────────────────────────────────
        const baseScore = scoredRoutes > 0 ? totalScore / scoredRoutes : 80
        const penaltyPerCritical = 15
        const penaltyPerWarning = 5
        const criticals = allFindings.filter((f) => f.severity === 'critical').length
        const warnings = allFindings.filter((f) => f.severity === 'warning').length
        const finalScore = Math.max(0, Math.round(baseScore - criticals * penaltyPerCritical - warnings * penaltyPerWarning))
        send({ type: 'score', score: finalScore })

        // ── PHASE 6: AI Fix generation ────────────────────────────────────────
        const issueCount = allFindings.filter((f) => f.severity !== 'info').length
        if (issueCount > 0) {
          log(`Generating AI fixes for ${issueCount} issue(s)…`)
          send({ type: 'iteration', n: 1 })

          const fixes = await generateMultipleFixes(allFindings, files, projectContext)
          for (const fix of fixes) {
            log(`Fix ready: ${fix.filePath}`)
            send({ type: 'fix', fix })
          }
        } else {
          log('No issues found — no fixes needed')
        }

        log(`Done. Score: ${finalScore}/100`)
        send({ type: 'complete', score: finalScore })
      } catch (err) {
        send({ type: 'error', message: String(err) })
      } finally {
        await closeBrowser().catch(() => {})
        if (!isClosed) {
          try { controller.close() } catch { /* already closed */ }
        }
      }
    },
    cancel() {
      isClosed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
