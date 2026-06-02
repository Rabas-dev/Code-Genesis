export interface ProviderConfig {
  id: string
  name: 'groq' | 'openai' | 'anthropic' | 'gemini'
  apiKey: string
  model: string
  enabled: boolean
  priority: number // 1 = highest
}

// ── Per-provider callers ─────────────────────────────────────────────────────

async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from provider')
  return text
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Empty response from Anthropic')
  return text
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  // 2.5 models use "thinking" tokens that count against the output budget,
  // so give them more headroom to avoid truncated responses.
  const maxOutputTokens = model.startsWith('gemini-2.5') ? 16000 : 8000
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status}: ${body}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

// ── Resolve provider → key + base URL ────────────────────────────────────────

function resolveKey(config: ProviderConfig): string {
  if (config.apiKey?.trim()) return config.apiKey.trim()
  // Fall back to env var when no user key is set
  const ENV: Record<ProviderConfig['name'], string | undefined> = {
    groq: process.env.GROQ_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  }
  return ENV[config.name] ?? ''
}

// ── Main router ───────────────────────────────────────────────────────────────

/**
 * Calls LLM providers in priority order. Falls back to the next provider if
 * one fails. If no providers array is supplied, defaults to Groq via env var.
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  providers?: ProviderConfig[]
): Promise<string> {
  // Build the chain: user-configured providers sorted by priority
  // If no providers given, fall back to env-var Groq
  const chain: ProviderConfig[] = providers?.length
    ? [...providers].filter((p) => p.enabled).sort((a, b) => a.priority - b.priority)
    : [{ id: 'groq-default', name: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile', enabled: true, priority: 1 }]

  const errors: string[] = []

  for (const config of chain) {
    const key = resolveKey(config)
    if (!key) {
      errors.push(`${config.name}: no API key`)
      continue
    }

    try {
      console.log(`[LLM] Trying ${config.name} (${config.model})…`)

      if (config.name === 'anthropic') {
        return await callAnthropic(key, config.model, systemPrompt, userMessage)
      }

      if (config.name === 'gemini') {
        return await callGemini(key, config.model, systemPrompt, userMessage)
      }

      // Groq and OpenAI both use the OpenAI-compatible format
      const BASE_URL: Record<string, string> = {
        groq: 'https://api.groq.com/openai/v1',
        openai: 'https://api.openai.com/v1',
      }
      return await callOpenAICompat(BASE_URL[config.name] ?? '', key, config.model, systemPrompt, userMessage)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${config.name}: ${msg}`)
      console.warn(`[LLM] ${config.name} failed — ${msg}. Trying next provider…`)
    }
  }

  throw new Error(`All LLM providers failed:\n${errors.join('\n')}`)
}
