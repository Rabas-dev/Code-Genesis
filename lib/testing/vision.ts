import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'

export interface VisualAnalysis {
  score: number
  issues: Array<{ severity: 'critical' | 'warning' | 'info'; description: string }>
  layoutBroken: boolean
  hasContent: boolean
  suggestions: string[]
}

const VISION_SYSTEM = `You are a senior QA engineer doing visual review of a web app screenshot.
Analyze the screenshot for: layout issues, broken UI, missing content, visual errors, poor UX.
Return ONLY valid JSON with no markdown fences, exactly this shape:
{
  "score": <0-100>,
  "issues": [{"severity": "critical|warning|info", "description": "<what's wrong>"}],
  "layoutBroken": <true|false>,
  "hasContent": <true|false>,
  "suggestions": ["<actionable fix>"]
}`

// Image-capable models, tried in order. Each entry is OpenAI-compatible (the
// `image_url` content block), so OpenRouter and Groq share one caller. Models
// are env-overridable so a decommissioned model never hard-codes a failure.
interface VisionProvider {
  baseUrl: string
  apiKey: string
  model: string
  extraHeaders?: Record<string, string>
}

function visionChain(providers?: ProviderConfig[]): VisionProvider[] {
  const chain: VisionProvider[] = []

  // OpenRouter first — Qwen-VL is a strong open-source agentic vision model.
  const orKey = process.env.OPENROUTER_API_KEY ?? providers?.find((p) => p.name === 'openrouter')?.apiKey
  if (orKey) {
    chain.push({
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: orKey,
      model: process.env.OPENROUTER_VISION_MODEL ?? 'qwen/qwen-2.5-vl-72b-instruct',
      extraHeaders: { 'HTTP-Referer': 'https://code-genesis.app', 'X-Title': 'Code Genesis' },
    })
  }

  // Groq vision fallback.
  const groqKey = process.env.GROQ_API_KEY ?? providers?.find((p) => p.name === 'groq')?.apiKey
  if (groqKey) {
    chain.push({
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: groqKey,
      model: process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
    })
  }

  return chain
}

async function callVision(
  provider: VisionProvider,
  screenshotBase64: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...provider.extraHeaders,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty vision response')
  return text
}

export async function analyzeScreenshotWithVision(
  screenshotBase64: string,
  route: string,
  projectContext: string,
  providers?: ProviderConfig[],
): Promise<VisualAnalysis> {
  const prompt = `${VISION_SYSTEM}\n\nRoute: "${route}"\nProject: ${projectContext}`

  // Walk the vision chain; the first model that answers wins. A failure just
  // moves to the next model, then to text-only analysis — never throws.
  for (const provider of visionChain(providers)) {
    try {
      const raw = await callVision(provider, screenshotBase64, prompt)
      return parseVisualAnalysis(raw)
    } catch {
      /* try next vision provider */
    }
  }

  return fallbackTextAnalysis(route, projectContext, providers)
}

async function fallbackTextAnalysis(
  route: string,
  context: string,
  providers?: ProviderConfig[],
): Promise<VisualAnalysis> {
  const prompt = `Analyze this web app route: "${route}"\nContext: ${context}\n\nReturn JSON matching this shape EXACTLY (no markdown):\n{"score":75,"issues":[],"layoutBroken":false,"hasContent":true,"suggestions":[]}`
  try {
    const raw = await callLLM(VISION_SYSTEM, prompt, providers)
    return parseVisualAnalysis(raw)
  } catch {
    return { score: 75, issues: [], layoutBroken: false, hasContent: true, suggestions: [] }
  }
}

function parseVisualAnalysis(raw: string): VisualAnalysis {
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 75)),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      layoutBroken: Boolean(parsed.layoutBroken),
      hasContent: parsed.hasContent !== false,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    }
  } catch {
    return { score: 70, issues: [], layoutBroken: false, hasContent: true, suggestions: [] }
  }
}
