import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import { languageInstruction } from '@/lib/ai/utils/language'
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

const SYSTEM_PROMPT = `You are an expert full-stack developer and UI/UX designer. Generate a complete, working, visually stunning Next.js 14 App Router project with TypeScript and Tailwind CSS.

UI DESIGN MANDATE — every generated app MUST look professional and polished:
- Use a dark background (#0a0a0a or #09090b) with light text by default, OR a clean white/gray-50 light theme — never a plain unstyled layout
- Apply a consistent design system: choose ONE accent color (violet-600, blue-600, emerald-600, or amber-500) and use it for CTAs, active states, and highlights only
- Use Tailwind's full design token set: rounded-xl/2xl for cards, shadow-lg/xl for elevation, ring-1/2 for borders, backdrop-blur for overlays
- ALL cards: rounded-xl border border-white/10 (dark) or border-gray-200 (light) bg-white/5 or bg-white p-4 or p-6
- ALL buttons: px-4 py-2 rounded-lg font-semibold text-sm transition-all with hover states (hover:opacity-90 or hover:scale-[1.02])
- ALL inputs: w-full rounded-lg border bg-white/5 or bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-{accent}/50
- Layout: use CSS Grid and Flexbox correctly — sidebars, headers, content areas must be properly structured
- Add meaningful empty states, loading skeletons (animate-pulse), and error states — never a blank white screen
- Typography hierarchy: text-2xl/3xl font-bold for page titles, text-lg font-semibold for section headers, text-sm for body, text-xs text-muted for metadata
- Use lucide-react icons throughout (it is bundled with Next.js projects) — import from 'lucide-react'
- Sidebar navigation (if applicable): fixed width w-64, border-r, items with hover:bg-white/5, active items with bg-accent/10 text-accent
- Data tables: rounded-xl overflow-hidden border, thead with bg-muted/30, tr hover:bg-white/5, th text-xs uppercase tracking-wider
- Dashboard stats: grid of 3-4 metric cards, each with an icon, a large number, a label, and a subtle trend indicator
- Forms: labeled inputs stacked vertically, submit button full-width at bottom, validation error text in red-400

STRICT RULES:
- Generate ONLY the files needed for the specific project described. Nothing else.
- Do NOT add unrelated features (e.g. if asked for a calculator, do NOT add auth, Firebase, todos, or unrelated components)
- Each file must have complete, working content — no pseudocode, no placeholders
- Use TypeScript for all .ts/.tsx files
- Keep it focused: 4–7 files maximum that form a cohesive, working project
- Files must work together — check that imports match what you export
- ONLY use packages from this allowed list: next, react, react-dom, typescript, tailwindcss, lucide-react, date-fns, zod. Do NOT import firebase, supabase, prisma, or any other heavy packages unless explicitly requested.
- Prefer native fetch() over axios for HTTP requests. Prefer crypto.randomUUID() for ID generation.

NEXT.JS APP ROUTER RULES (critical — violating these causes build errors):
- Any file that uses useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer, useRouter, usePathname, useSearchParams, or any other React hook MUST start with 'use client' as the very first line
- Any file that uses browser APIs (window, document, localStorage, navigator) MUST start with 'use client'
- app/layout.tsx should NOT have 'use client' unless it uses hooks
- app/page.tsx almost always needs 'use client' if it has any interactivity
- Server Components cannot use hooks — make pages client components by default for interactive apps
- NEVER put an <a> tag inside next/link <Link> (causes "Invalid <Link> with <a> child"). Write <Link href="/x" className="...">text</Link> directly — Link renders its own anchor.
- next/image <Image> requires width and height props, or use a plain <img> for simplicity
- Every component file must export a default React component. Pages must be 'export default function'.

IMPORTS & FILES (critical — missing files cause "Module not found" build errors):
- NEVER import a local file you do not also generate in this same response. If a component imports './data/projects.json' or '../lib/utils', you MUST include that exact file in the files array.
- PREFER inlining small data directly in the component (e.g. a const array) instead of importing a separate JSON file.
- Relative import paths must be correct for the importing file's location. From 'components/X.tsx' (project root), data at the root is '../data/file.json' (ONE ../), not '../../'. Double-check every relative path's depth.
- When unsure, use the '@/' path alias (e.g. '@/data/projects') which always resolves from the project root.

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

  const langNote = languageInstruction(originalPrompt)
  const systemWithLang = langNote ? `${SYSTEM_PROMPT}\n\n${langNote}` : SYSTEM_PROMPT
  const raw = await callLLM(systemWithLang, userMessage, providers)
  return safeParse<GenerationResult>(raw)
}
