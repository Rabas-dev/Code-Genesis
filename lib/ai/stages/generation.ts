import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { PlanningResult } from './planning'

export interface GeneratedFile {
  path: string
  type: 'file'
  content: string
}

export interface GenerationResult {
  stage: 'generation'
  progress: number
  project_name: string
  files: GeneratedFile[]
}

const SYSTEM_PROMPT = `You are an expert full-stack developer. Generate a complete, working Next.js 14 App Router project with TypeScript and Tailwind CSS.

STRICT RULES:
- Generate ONLY the files needed for the specific project described. Nothing else.
- Do NOT add unrelated features (e.g. if asked for a calculator, do NOT add auth, Firebase, todos, or unrelated components)
- Each file must have complete, working content — no pseudocode, no placeholders
- Use TypeScript for all .ts/.tsx files
- Keep it focused: 4–7 files maximum that form a cohesive, working project
- Files must work together — check that imports match what you export
- ONLY use packages from this allowed list: next, react, react-dom, typescript, tailwindcss, axios, uuid, date-fns, zod. Do NOT import firebase, supabase, prisma, or any other heavy packages unless explicitly requested.
- Prefer native fetch() over axios for HTTP requests. Prefer crypto.randomUUID() over uuid for ID generation.

NEXT.JS APP ROUTER RULES (critical — violating these causes build errors):
- Any file that uses useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer, useRouter, usePathname, useSearchParams, or any other React hook MUST start with 'use client' as the very first line
- Any file that uses browser APIs (window, document, localStorage, navigator) MUST start with 'use client'
- app/layout.tsx should NOT have 'use client' unless it uses hooks
- app/page.tsx almost always needs 'use client' if it has any interactivity
- Server Components cannot use hooks — make pages client components by default for interactive apps
- NEVER put an <a> tag inside next/link <Link> (causes "Invalid <Link> with <a> child"). Write <Link href="/x" className="...">text</Link> directly — Link renders its own anchor.
- next/image <Image> requires width and height props, or use a plain <img> for simplicity
- Every component file must export a default React component. Pages must be 'export default function'.

Return ONLY valid JSON in exactly this format — no markdown, no explanation, no trailing text:
{
  "stage": "generation",
  "progress": 100,
  "project_name": "<project name>",
  "files": [
    {
      "path": "app/page.tsx",
      "type": "file",
      "content": "<complete file content>"
    }
  ]
}`

export async function runGeneration(plan: PlanningResult, originalPrompt: string, providers?: ProviderConfig[]): Promise<GenerationResult> {
  const userMessage = `
Build ONLY this: ${originalPrompt}

Project name: ${plan.projectName}
Core features to implement: ${plan.features.join(', ')}
Tech stack: ${plan.techStack.join(', ')}
Generate exactly ${plan.fileCount} focused files.

DO NOT add any features not mentioned above. Stay strictly on task.`

  const raw = await callLLM(SYSTEM_PROMPT, userMessage, providers)
  return safeParse<GenerationResult>(raw)
}
