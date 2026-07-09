import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'

export interface FileChange {
  path: string
  content: string
}

const SYSTEM_PROMPT = `You are an autonomous debugging agent for a Next.js 14 (App Router) + TypeScript + Tailwind project.

You are given a BUILD or RUNTIME ERROR and the project's files. Diagnose the root cause and return the COMPLETE corrected content of ONLY the files that must change to fix the error.

Rules:
- Return ONLY valid JSON, no markdown fences.
- Fix the actual cause, not the symptom. Common causes: missing 'use client' for hook usage, a <Link> wrapping an <a>, importing a file/package that does not exist, wrong relative import paths, TypeScript type errors, missing default exports.
- If the error is a missing local file, CREATE it (return it as a new file with sensible content).
- Return complete files only — never diffs or partial snippets.
- Keep changes minimal and targeted.

Return exactly:
{
  "diagnosis": "<one sentence: the root cause>",
  "changes": [ { "path": "app/page.tsx", "content": "<complete fixed file>" } ]
}`

export async function POST(req: NextRequest) {
  try {
    const { error, files, providers }: {
      error: string
      files: { path: string; content: string }[]
      providers?: ProviderConfig[]
    } = await req.json()

    if (!error?.trim()) return NextResponse.json({ error: 'No error text provided' }, { status: 400 })

    // Cap file context to stay within token limits
    let budget = 40000
    const parts: string[] = []
    for (const f of files ?? []) {
      const block = `\n\n=== FILE: ${f.path} ===\n${f.content}`
      if (block.length > budget) { parts.push(`\n\n=== FILE: ${f.path} (truncated) ===\n${f.content.slice(0, budget)}`); break }
      parts.push(block); budget -= block.length
    }

    const userPrompt = `BUILD/RUNTIME ERROR:\n${error}\n\nPROJECT FILES:${parts.join('')}\n\nReturn the fix JSON.`

    const raw = await callLLM(SYSTEM_PROMPT, userPrompt, providers)
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed: { diagnosis?: string; changes?: FileChange[] }
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Last-ditch: extract the first {...} block
      const m = clean.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : { changes: [] }
    }

    return NextResponse.json({
      diagnosis: parsed.diagnosis ?? 'Applied a fix',
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    })
  } catch (err) {
    console.error('[/api/autofix]', err)
    return NextResponse.json({ error: 'Auto-fix failed' }, { status: 500 })
  }
}
