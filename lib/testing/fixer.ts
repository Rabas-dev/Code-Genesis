import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import type { ProjectFile } from '@/types'
import type { TestFinding } from '@/store/useTestStore'

export interface CodeFix {
  filePath: string
  originalContent: string
  fixedContent: string
  reason: string
}

const FIX_SYSTEM = `You are an expert Next.js / React developer. Fix the reported issue in the provided file.

Rules:
- Return ONLY valid JSON, no markdown fences
- Include the COMPLETE fixed file content (not a diff)
- Make the minimal change needed to fix the issue
- Do not add unnecessary features

Return exactly: {"fixed": "<complete file content>", "explanation": "<one sentence why>"}`

function findRelevantFile(finding: TestFinding, files: ProjectFile[]): ProjectFile | null {
  const route = finding.route

  // Try to match route → file
  const candidates = files.filter((f) => {
    const p = f.path.replace(/^\//, '')
    if (route === '/' && (p === 'app/page.tsx' || p === 'pages/index.tsx')) return true
    if (route !== '/') {
      const routeSlug = route.replace(/^\//, '')
      if (p.includes(routeSlug) && p.endsWith('.tsx')) return true
    }
    return false
  })

  if (candidates.length > 0) return candidates[0]

  // Category-based fallback
  if (finding.category === 'console-error' || finding.category === 'visual') {
    return files.find((f) => f.path.endsWith('page.tsx')) ?? null
  }
  if (finding.category === 'api') {
    return files.find((f) => f.path.includes('/api/') && f.path.endsWith('route.ts')) ?? null
  }
  if (finding.category === 'a11y') {
    return files.find((f) => f.path.endsWith('.tsx')) ?? null
  }

  return files.find((f) => f.path.endsWith('page.tsx')) ?? null
}

export async function generateFix(
  finding: TestFinding,
  files: ProjectFile[],
  projectContext: string,
  providers?: ProviderConfig[],
): Promise<CodeFix | null> {
  const targetFile = findRelevantFile(finding, files)
  if (!targetFile) return null

  const prompt = `ISSUE:
Category: ${finding.category}
Severity: ${finding.severity}
Description: ${finding.description}
Route: ${finding.route}

FILE TO FIX: ${targetFile.path}
CONTENT:
${targetFile.content.slice(0, 8000)}

PROJECT CONTEXT: ${projectContext}`

  try {
    const raw = await callLLM(FIX_SYSTEM, prompt, providers)
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (!parsed.fixed || typeof parsed.fixed !== 'string') return null

    return {
      filePath: targetFile.path,
      originalContent: targetFile.content,
      fixedContent: parsed.fixed,
      reason: parsed.explanation ?? finding.description,
    }
  } catch {
    return null
  }
}

export async function generateMultipleFixes(
  findings: TestFinding[],
  files: ProjectFile[],
  projectContext: string,
  providers?: ProviderConfig[],
): Promise<CodeFix[]> {
  // Only fix critical + warning issues, deduplicate by file
  const critical = findings.filter((f) => f.severity === 'critical' || f.severity === 'warning')
  const seen = new Set<string>()
  const fixes: CodeFix[] = []

  for (const finding of critical.slice(0, 5)) {
    const file = findRelevantFile(finding, files)
    if (!file || seen.has(file.path)) continue
    seen.add(file.path)

    const fix = await generateFix(finding, files, projectContext, providers)
    if (fix) fixes.push(fix)
  }

  return fixes
}
