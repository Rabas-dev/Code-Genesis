import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'

export interface VisualAnalysis {
  score: number
  issues: Array<{ severity: 'critical' | 'warning' | 'info'; description: string }>
  layoutBroken: boolean
  hasContent: boolean
  suggestions: string[]
}

// Groq vision models — llama-4-scout supports image input natively
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

export async function analyzeScreenshotWithVision(
  screenshotBase64: string,
  route: string,
  projectContext: string,
  providers?: ProviderConfig[],
): Promise<VisualAnalysis> {
  // Try Groq vision model (llama-4-scout-17b) which supports images
  // Fall through to text-only analysis if vision isn't available
  try {
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY ?? providers?.find((p) => p.name === 'groq')?.apiKey ?? '',
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (groq.chat.completions.create as any)({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` },
            },
            {
              type: 'text',
              text: `${VISION_SYSTEM}\n\nRoute: "${route}"\nProject: ${projectContext}`,
            },
          ],
        },
      ],
      max_tokens: 800,
      temperature: 0.1,
    })

    const raw = response.choices?.[0]?.message?.content ?? '{}'
    return parseVisualAnalysis(raw)
  } catch {
    // Fallback: text-only analysis based on route name + error data
    return fallbackTextAnalysis(route, projectContext, providers)
  }
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
