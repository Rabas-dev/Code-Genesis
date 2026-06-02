import { NextRequest, NextResponse } from 'next/server'
import { runRequirements } from '@/lib/ai/stages/requirements'
import type { ProviderConfig } from '@/lib/ai/providers/llm-router'

export async function POST(req: NextRequest) {
  try {
    const { prompt, providers }: { prompt: string; providers?: ProviderConfig[] } = await req.json()
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

    const result = await runRequirements(prompt, providers)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/requirements]', err)
    return NextResponse.json({ error: 'Failed to analyze requirements' }, { status: 500 })
  }
}
