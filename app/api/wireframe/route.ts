import { NextRequest, NextResponse } from 'next/server'
import { runWireframe } from '@/lib/ai/stages/wireframe'
import type { ArchitectureDoc } from '@/lib/ai/stages/architecture-doc'
import type { ProviderConfig } from '@/lib/ai/providers/llm-router'

export async function POST(req: NextRequest) {
  try {
    const { prompt, architecture, providers }: {
      prompt: string
      architecture: ArchitectureDoc
      providers?: ProviderConfig[]
    } = await req.json()

    if (!prompt?.trim() || !architecture) {
      return NextResponse.json({ error: 'prompt and architecture are required' }, { status: 400 })
    }

    const wireframe = await runWireframe(architecture, prompt, providers)
    return NextResponse.json(wireframe)
  } catch (err) {
    console.error('[/api/wireframe]', err)
    return NextResponse.json({ error: 'Wireframe generation failed' }, { status: 500 })
  }
}
