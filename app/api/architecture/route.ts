import { NextRequest, NextResponse } from 'next/server'
import { runArchitecture } from '@/lib/ai/stages/architecture-doc'
import type { ProviderConfig } from '@/lib/ai/providers/llm-router'

export async function POST(req: NextRequest) {
  try {
    const { prompt, requirements, answers, providers }: {
      prompt: string
      requirements: unknown
      answers?: Record<string, string>
      providers?: ProviderConfig[]
    } = await req.json()
    if (!prompt?.trim() || !requirements) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    const result = await runArchitecture(prompt, requirements as Parameters<typeof runArchitecture>[1], answers ?? {}, providers)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/architecture]', err)
    return NextResponse.json({ error: 'Failed to generate architecture' }, { status: 500 })
  }
}
