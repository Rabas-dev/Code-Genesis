export interface ProviderConfig {
  id: string
  name: 'groq' | 'openai' | 'anthropic' | 'gemini' | 'openrouter'
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
  userMessage: string,
  extraHeaders?: Record<string, string>,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 32000,
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
      max_tokens: 32000,
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
  // 2.5 models support large output — give them full headroom for code generation.
  const maxOutputTokens = model.startsWith('gemini-2.5') ? 65536 : 32000
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
    openrouter: process.env.OPENROUTER_API_KEY,
  }
  return ENV[config.name] ?? ''
}

// A built-in last-resort chain using env keys, so a request never fails just
// because the user's configured providers all ran out of quota.
function envFallbackChain(): ProviderConfig[] {
  const chain: ProviderConfig[] = []
  // OpenRouter first: Qwen3-Coder → GLM-4.6 → DeepSeek give the most reliable
  // coding/JSON output. Each is a separate hop so one model's outage or rate
  // limit cascades to the next instead of failing the whole request.
  if (process.env.OPENROUTER_API_KEY) {
    chain.push({ id: 'env-or-qwen', name: 'openrouter', apiKey: '', model: 'qwen/qwen3-coder', enabled: true, priority: 1 })
    chain.push({ id: 'env-or-glm', name: 'openrouter', apiKey: '', model: 'z-ai/glm-4.6', enabled: true, priority: 2 })
    chain.push({ id: 'env-or-deepseek', name: 'openrouter', apiKey: '', model: 'deepseek/deepseek-chat', enabled: true, priority: 3 })
  }
  if (process.env.GEMINI_API_KEY) chain.push({ id: 'env-gemini', name: 'gemini', apiKey: '', model: 'gemini-2.5-flash', enabled: true, priority: 4 })
  if (process.env.GROQ_API_KEY) chain.push({ id: 'env-groq', name: 'groq', apiKey: '', model: 'llama-3.3-70b-versatile', enabled: true, priority: 5 })
  return chain
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
  // Build the chain: user-configured providers sorted by priority,
  // then ALWAYS append the env-key fallback chain so a request survives even
  // if every user provider is out of quota. Deduplicate by name+model.
  const userChain = providers?.length
    ? [...providers].filter((p) => p.enabled).sort((a, b) => a.priority - b.priority)
    : []
  const seen = new Set<string>()
  const chain: ProviderConfig[] = [...userChain, ...envFallbackChain()].filter((c) => {
    const k = `${c.name}:${c.model}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  if (chain.length === 0) {
    throw new Error('No LLM providers configured. Add an API key in Settings (Groq, Gemini, and OpenRouter all have free tiers).')
  }

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
      if (config.name === 'openrouter') {
        // OpenRouter is OpenAI-compatible; the extra headers are optional attribution
        return await callOpenAICompat(
          'https://openrouter.ai/api/v1', key, config.model, systemPrompt, userMessage,
          { 'HTTP-Referer': 'https://code-genesis.app', 'X-Title': 'Code Genesis' },
        )
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
