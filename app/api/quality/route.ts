import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { CodeJudgeResult } from '@/types'

const SYSTEM_PROMPT = `You are a principal engineer doing a holistic code review of an ENTIRE project (multiple files), not a single snippet.

Evaluate the whole codebase across: security, performance, code quality, and architecture.
Consider cross-file concerns: are imports consistent, is structure sensible, is state managed well, are there obvious bugs or anti-patterns?
Be strict but fair. Reference specific files in your issue descriptions.

You MUST return ONLY valid JSON. No markdown. No explanation. No trailing text.

Return exactly this shape:
{
  "overallScore": <0-100>,
  "scores": { "security": <0-100>, "performance": <0-100>, "quality": <0-100>, "architecture": <0-100> },
  "issues": [
    {
      "id": "ISS-1",
      "title": "<short issue title>",
      "severity": "critical" | "warning" | "info",
      "category": "security" | "performance" | "style" | "architecture",
      "description": "<what the problem is, mention the file path>",
      "suggestion": "<how to fix it>"
    }
  ],
  "verdict": "excellent" | "good" | "needs-improvement" | "poor"
}`

export async function POST(req: NextRequest) {
  try {
    const { files, providers }: {
      files: { path: string; content: string }[]
      providers?: ProviderConfig[]
    } = await req.json()

    if (!files?.length) {
      return NextResponse.json({ error: 'No files to analyze' }, { status: 400 })
    }

    // Build a single review payload, capped so we stay within context limits.
    let budget = 45000
    const parts: string[] = []
    for (const f of files) {
      const block = `\n\n=== FILE: ${f.path} ===\n${f.content}`
      if (block.length > budget) {
        parts.push(`\n\n=== FILE: ${f.path} (truncated) ===\n${f.content.slice(0, budget)}`)
        break
      }
      parts.push(block)
      budget -= block.length
    }

    const userPrompt = `Review this ${files.length}-file project as a whole and return the analysis JSON:\n${parts.join('')}`

    const raw = await callLLM(SYSTEM_PROMPT, userPrompt, providers)
    const result = safeParse<CodeJudgeResult>(raw)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/quality]', err)
    return NextResponse.json({ error: 'Quality analysis failed' }, { status: 500 })
  }
}
