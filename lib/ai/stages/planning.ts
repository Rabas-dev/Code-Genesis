import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'

export interface PlanningResult {
  stage: 'planning'
  progress: number
  projectName: string
  features: string[]
  description: string
  techStack: string[]
  fileCount: number
}

const SYSTEM_PROMPT = `You are an expert software architect. Analyze the project prompt and produce a structured architecture plan.

Return ONLY valid JSON in exactly this format — no markdown, no explanation:
{
  "stage": "planning",
  "progress": 50,
  "projectName": "<concise project name>",
  "features": ["<feature 1>", "<feature 2>", "<feature 3>", "<feature 4>", "<feature 5>"],
  "description": "<one sentence describing what will be built>",
  "techStack": ["Next.js 14", "TypeScript", "Tailwind CSS", "<other relevant tech>"],
  "fileCount": <number between 4 and 8>
}`

export async function runPlanning(prompt: string, providers?: ProviderConfig[]): Promise<PlanningResult> {
  const raw = await callLLM(SYSTEM_PROMPT, `Project prompt: ${prompt}`, providers)
  return safeParse<PlanningResult>(raw)
}
