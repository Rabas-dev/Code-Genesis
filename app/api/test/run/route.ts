import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/ai/providers/llm-router'
import type { TestFinding } from '@/store/useTestStore'
import type { ProjectFile } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

// ── Lightweight, crash-free testing ──────────────────────────────────────────
// No browser, no Playwright, no Chromium — those were the memory hogs that got
// the server SIGKILL'd. Instead we statically analyze the generated files
// (already in the DB) and ask the model for a documented quality report.

interface SimpleFinding {
  file: string
  severity: TestFinding['severity']
  category: TestFinding['category']
  description: string
}

// Each rule scans one file's content and returns any issues it finds.
function analyzeFile(path: string, content: string): SimpleFinding[] {
  const out: SimpleFinding[] = []
  const add = (severity: SimpleFinding['severity'], category: SimpleFinding['category'], description: string) =>
    out.push({ file: path, severity, category, description })

  const isComponent = /\.(tsx|jsx)$/.test(path)
  const trimmed = content.trim()

  // Empty / stub file
  if (trimmed.length < 10) {
    add('warning', 'console-error', 'File is empty or a stub — no implementation')
    return out
  }

  // Hardcoded secrets / API keys
  if (/(sk-[A-Za-z0-9]{20,}|gsk_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{20,}|ghp_[A-Za-z0-9]{20,})/.test(content)) {
    add('critical', 'api', 'Possible hardcoded secret/API key — move it to an environment variable')
  }

  // Client hooks without the "use client" directive (runtime error in App Router)
  if (isComponent && /\b(useState|useEffect|useRef|useContext|useReducer)\s*\(/.test(content) && !/['"]use client['"]/.test(content)) {
    add('critical', 'console-error', 'Uses React hooks but is missing the "use client" directive')
  }

  // XSS risk
  if (/dangerouslySetInnerHTML/.test(content)) {
    add('warning', 'a11y', 'Uses dangerouslySetInnerHTML — verify the content is sanitized (XSS risk)')
  }

  // Raw <img> instead of next/image
  if (isComponent && /<img\s/.test(content)) {
    add('info', 'visual', 'Uses a raw <img> tag — consider next/image for optimization')
  }

  // Leftover debug logs
  if (/console\.(log|debug)\s*\(/.test(content)) {
    add('info', 'console-error', 'Contains console.log/debug statements — remove before shipping')
  }

  // Loose typing
  if (/:\s*any\b|<any>/.test(content)) {
    add('info', 'console-error', 'Uses the "any" type — tighten typing for safety')
  }

  // Unfinished work
  if (/\b(TODO|FIXME)\b/.test(content)) {
    add('info', 'console-error', 'Contains TODO/FIXME markers — unfinished work')
  }

  return out
}

function discoverRoutes(files: ProjectFile[]): string[] {
  const routes = new Set<string>()
  for (const f of files) {
    const p = f.path.replace(/^\//, '')
    if (p.startsWith('app/') && /\/page\.(tsx|jsx)$/.test(p)) {
      const r = '/' + p.replace('app/', '').replace(/\/page\.(tsx|jsx)$/, '')
      if (!r.includes('[')) routes.add(r || '/')
    }
    if (p === 'app/page.tsx' || p === 'app/page.jsx') routes.add('/')
  }
  return Array.from(routes).sort()
}

function discoverApiRoutes(files: ProjectFile[]): string[] {
  return files
    .map((f) => f.path.replace(/^\//, ''))
    .filter((p) => p.startsWith('app/api/') && /route\.(ts|js)$/.test(p))
    .map((p) => '/' + p.replace('app/', '').replace(/\/route\.(ts|js)$/, ''))
    .sort()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return new Response('Missing projectId', { status: 400 })

  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (isClosed) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { isClosed = true }
      }
      const log = (message: string) => send({ type: 'log', message })

      try {
        // ── Load files ────────────────────────────────────────────────────────
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
          id: f.id, path: f.path, content: f.content, language: f.language,
        }))

        const { data: projectRow } = await supabase
          .from('projects').select('name, prompt').eq('id', projectId).single()
        const projectName = projectRow?.name ?? 'Generated app'
        const projectPrompt = projectRow?.prompt ?? ''

        // ── Static analysis ───────────────────────────────────────────────────
        const sourceFiles = files.filter((f) => /\.(tsx|ts|jsx|js)$/.test(f.path))
        log(`Analyzing ${sourceFiles.length} source file(s)…`)

        let seq = 0
        const allFindings: TestFinding[] = []

        for (const f of sourceFiles) {
          if (isClosed) break
          send({ type: 'route-start', route: f.path })
          const issues = analyzeFile(f.path, f.content)
          for (const iss of issues) {
            const finding: TestFinding = {
              id: `${iss.file}-${seq++}`,
              route: iss.file,
              severity: iss.severity,
              category: iss.category,
              description: iss.description,
            }
            allFindings.push(finding)
            send({ type: 'finding', finding })
          }
          const hasCritical = issues.some((i) => i.severity === 'critical')
          send({ type: 'route-result', route: f.path, status: hasCritical ? 'fail' : 'pass', loadTimeMs: 0 })
        }

        const routes = discoverRoutes(files)
        const apiRoutes = discoverApiRoutes(files)
        log(`Found ${routes.length} page route(s) and ${apiRoutes.length} API route(s)`)

        // ── Score ─────────────────────────────────────────────────────────────
        const critical = allFindings.filter((f) => f.severity === 'critical').length
        const warning = allFindings.filter((f) => f.severity === 'warning').length
        const info = allFindings.filter((f) => f.severity === 'info').length
        const score = Math.max(0, 100 - critical * 15 - warning * 5 - info * 1)
        send({ type: 'score', score })

        // ── Documented report (Qwen) ──────────────────────────────────────────
        log('Generating documented report…')
        const findingsSummary = allFindings.length
          ? allFindings.map((f) => `- [${f.severity}] ${f.route}: ${f.description}`).join('\n')
          : '- No static issues detected.'

        const SYSTEM = `You are a senior QA engineer. Write a concise, well-structured TEST & QUALITY REPORT in GitHub-flavored Markdown. Use these sections with ## headings: Overview, Routes, Issues Found, Recommendations, Verdict. Be specific and practical. Do not invent issues beyond what is provided. Keep it under ~400 words.`
        const userPrompt = `Project: ${projectName}
Description: ${projectPrompt}
Page routes (${routes.length}): ${routes.join(', ') || 'none'}
API routes (${apiRoutes.length}): ${apiRoutes.join(', ') || 'none'}
Source files analyzed: ${sourceFiles.length}
Quality score: ${score}/100 (critical: ${critical}, warnings: ${warning}, info: ${info})

Static analysis findings:
${findingsSummary}

Write the report now.`

        let report: string
        try {
          report = await callLLM(SYSTEM, userPrompt)
        } catch {
          // Fallback report if the model is unavailable — still crash-free.
          report = `## Overview
**${projectName}** — quality score **${score}/100**.

## Routes
- Page routes (${routes.length}): ${routes.join(', ') || 'none'}
- API routes (${apiRoutes.length}): ${apiRoutes.join(', ') || 'none'}

## Issues Found
${findingsSummary}

## Recommendations
Address critical issues first, then warnings. Remove debug logs and tighten typing.

## Verdict
${score >= 80 ? 'Good — minor polish needed.' : score >= 60 ? 'Fair — several issues to resolve.' : 'Needs work — resolve the critical issues before shipping.'}`
        }

        send({ type: 'report', report })
        log(`Done. Score: ${score}/100`)
        send({ type: 'complete', score })
      } catch (err) {
        send({ type: 'error', message: String(err) })
      } finally {
        if (!isClosed) {
          try { controller.close() } catch { /* already closed */ }
        }
      }
    },
    cancel() { isClosed = true },
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
