import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'

export interface RequirementQuestion {
  id: string
  question: string
  hint: string
}

export interface RequirementsDoc {
  projectName: string
  overview: string
  coreFeatures: string[]
  techStack: string[]
  questions: RequirementQuestion[]
}

const SYSTEM_PROMPT = `You are a senior software architect conducting a requirements analysis session.

Analyze the project prompt and produce a structured requirements document. Also generate 3–5 smart clarifying questions that will help refine the implementation (authentication needed? specific styling? database or local state? etc).

Return ONLY valid JSON — no markdown, no explanation:
{
  "projectName": "<concise title>",
  "overview": "<2-3 sentence description of what will be built>",
  "coreFeatures": ["<feature 1>", "<feature 2>", "<feature 3>", "<feature 4>", "<feature 5>"],
  "techStack": ["Next.js 14", "TypeScript", "Tailwind CSS", "<other relevant>"],
  "questions": [
    { "id": "q1", "question": "<specific clarifying question>", "hint": "<example answer or options>" },
    { "id": "q2", "question": "<specific clarifying question>", "hint": "<example answer or options>" },
    { "id": "q3", "question": "<specific clarifying question>", "hint": "<example answer or options>" }
  ]
}`

export async function runRequirements(prompt: string, providers?: ProviderConfig[]): Promise<RequirementsDoc> {
  const raw = await callLLM(SYSTEM_PROMPT, `Project prompt: ${prompt}`, providers)
  return safeParse<RequirementsDoc>(raw)
}
