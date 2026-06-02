import { NextRequest, NextResponse } from 'next/server'
import { callLLM } from '@/lib/ai/providers/llm-router'
import type { ProviderConfig } from '@/lib/ai/providers/llm-router'

export async function POST(req: NextRequest) {
  try {
    const { provider }: { provider: ProviderConfig } = await req.json()
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 })

    // Single-provider test — force only this provider
    const testProviders: ProviderConfig[] = [{ ...provider, enabled: true, priority: 1 }]

    const result = await callLLM(
      'You are a helpful assistant. Reply with only one short sentence.',
      'Say "API connection successful" and nothing else.',
      testProviders
    )

    return NextResponse.json({ success: true, response: result.trim() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: msg }, { status: 200 })
  }
}
