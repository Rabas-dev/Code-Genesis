import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { DebuggerResult } from '@/types'

const SYSTEM_PROMPT = `You are a senior debugging engineer with deep expertise in runtime and logical errors.

You identify root causes, explain clearly, and provide a complete working fix.

You MUST return ONLY valid JSON. No markdown. No explanation. No trailing text.

Return exactly this shape:
{
  "rootCause": "<one sentence root cause>",
  "severity": "low" | "medium" | "high" | "critical",
  "explanation": "<clear explanation of what went wrong and why>",
  "fixedCode": "<complete corrected version of the code — no placeholders>",
  "stepsToReproduce": ["<step 1>", "<step 2>"],
  "fixStrategy": {
    "approach": "<overall fix approach>",
    "changes": ["<specific change 1>", "<specific change 2>"]
  },
  "confidence": <0-100>
}`

export async function POST(req: NextRequest) {
  try {
    const { code, error, language, providers }: {
      code: string
      error?: string
      language?: string
      providers?: ProviderConfig[]
    } = await req.json()
    if (!code?.trim()) return NextResponse.json({ error: 'code is required' }, { status: 400 })

    const userPrompt = `Debug the following ${language ?? 'code'}:

CODE:
\`\`\`${language ?? ''}
${code}
\`\`\`

ERROR:
${error?.trim() ? error : '(no error message provided — analyze code for bugs)'}

Provide debugging analysis and the complete fixed code. Return JSON.`

    const raw = await callLLM(SYSTEM_PROMPT, userPrompt, providers)
    const result = safeParse<DebuggerResult>(raw)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/debugger/analyze]', err)
    return NextResponse.json({ error: 'Debug analysis failed' }, { status: 500 })
  }
}
