import { NextRequest, NextResponse } from 'next/server'
import { runOrchestrator } from '@/lib/ai/orchestrator'
import type { ProviderConfig } from '@/lib/ai/providers/llm-router'

export async function POST(req: NextRequest) {
  try {
    const { prompt, requirements, architecture, answers, layoutDescription, providers }: {
      prompt: string
      requirements?: unknown
      architecture?: unknown
      answers?: Record<string, string>
      layoutDescription?: string
      providers?: ProviderConfig[]
    } = await req.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const result = await runOrchestrator(
      prompt,
      requirements as Parameters<typeof runOrchestrator>[1],
      architecture as Parameters<typeof runOrchestrator>[2],
      answers,
      layoutDescription,
      providers
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/generate]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
