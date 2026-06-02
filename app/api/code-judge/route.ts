import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { CodeJudgeResult } from '@/types'

const SYSTEM_PROMPT = `You are a senior code reviewer with 15+ years experience in production systems.

Evaluate the submitted code across: security, performance, code quality, and architecture.
Be strict but fair. Identify concrete, line-level issues where possible.

You MUST return ONLY valid JSON. No markdown. No explanation. No trailing text.

Return exactly this shape:
{
  "overallScore": <0-100>,
  "scores": {
    "security": <0-100>,
    "performance": <0-100>,
    "quality": <0-100>,
    "architecture": <0-100>
  },
  "issues": [
    {
      "id": "ISS-1",
      "title": "<short issue title>",
      "severity": "critical" | "warning" | "info",
      "category": "security" | "performance" | "style" | "architecture",
      "line": <optional line number>,
      "description": "<what the problem is>",
      "suggestion": "<how to fix it>"
    }
  ],
  "improvedCode": "<complete rewritten version of the code with all issues fixed>",
  "verdict": "excellent" | "good" | "needs-improvement" | "poor"
}`

export async function POST(req: NextRequest) {
  try {
    const { code, language, providers }: { code: string; language?: string; providers?: ProviderConfig[] } = await req.json()
    if (!code?.trim()) return NextResponse.json({ error: 'code is required' }, { status: 400 })

    const userPrompt = `Review the following ${language ?? 'code'}:

\`\`\`${language ?? ''}
${code}
\`\`\`

Return the analysis JSON.`

    const raw = await callLLM(SYSTEM_PROMPT, userPrompt, providers)
    const result = safeParse<CodeJudgeResult>(raw)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/code-judge]', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
