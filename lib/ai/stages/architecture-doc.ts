import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { RequirementsDoc } from './requirements'

export interface ArchFileNode {
  path: string
  description: string
}

export interface ArchComponent {
  name: string
  type: 'page' | 'component' | 'hook' | 'util' | 'api' | 'store'
  purpose: string
}

export interface ArchitectureDoc {
  projectName: string
  summary: string
  fileTree: ArchFileNode[]
  components: ArchComponent[]
  dataFlow: string
  techStack: string[]
  estimatedFiles: number
}

const SYSTEM_PROMPT = `You are a senior software architect. Design the technical architecture for the project based on the requirements.

Produce a detailed architecture document covering the file structure, components, and data flow.

Return ONLY valid JSON — no markdown, no explanation:
{
  "projectName": "<project name>",
  "summary": "<technical summary of how the system will be built>",
  "fileTree": [
    { "path": "app/page.tsx", "description": "<what this file does>" },
    { "path": "components/Calculator.tsx", "description": "<what this file does>" }
  ],
  "components": [
    { "name": "<ComponentName>", "type": "component", "purpose": "<what it does>" }
  ],
  "dataFlow": "<1-2 sentence description of how data flows through the app>",
  "techStack": ["Next.js 14", "TypeScript", "Tailwind CSS"],
  "estimatedFiles": <number 4-8>
}`

export async function runArchitecture(
  prompt: string,
  requirements: RequirementsDoc,
  answers: Record<string, string>,
  providers?: ProviderConfig[]
): Promise<ArchitectureDoc> {
  const answeredQuestions = requirements.questions
    .map((q) => `Q: ${q.question}\nA: ${answers[q.id] ?? '(not answered)'}`)
    .join('\n\n')

  const userMessage = `
Project: ${requirements.projectName}
Original prompt: ${prompt}
Core features: ${requirements.coreFeatures.join(', ')}

Clarifying answers from the user:
${answeredQuestions}

Design a minimal, focused architecture. Only include what's needed for this specific project.`

  const raw = await callLLM(SYSTEM_PROMPT, userMessage, providers)
  return safeParse<ArchitectureDoc>(raw)
}
