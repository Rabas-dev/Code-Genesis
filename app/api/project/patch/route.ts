import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CLIENT_HOOKS = ['useState','useEffect','useRef','useCallback','useMemo','useContext','useReducer','useLayoutEffect','useTransition','useRouter','usePathname','useSearchParams','useParams']
const CLIENT_HOOK_RE = new RegExp(`\\b(${CLIENT_HOOKS.join('|')})\\s*\\(`)
const BROWSER_API_RE = /\b(window|document|localStorage|sessionStorage|navigator)\b/

function ensureClientDirective(content: string, filePath: string): string {
  const ext = path.extname(filePath)
  if (!['.tsx','.jsx','.ts','.js'].includes(ext)) return content
  if (/^['"]use client['"]/.test(content.trimStart())) return content
  if (filePath.includes('/api/') || filePath.endsWith('route.ts') || filePath.endsWith('route.tsx')) return content
  if (CLIENT_HOOK_RE.test(content) || BROWSER_API_RE.test(content)) return `'use client'\n\n${content}`
  return content
}

// Patch individual files in the running project directory so Next.js HMR picks them up
export async function POST(req: NextRequest) {
  try {
    const { projectId, changes }: {
      projectId: string
      changes: { path: string; content: string }[]
    } = await req.json()

    if (!projectId || !Array.isArray(changes)) {
      return NextResponse.json({ error: 'Missing projectId or changes' }, { status: 400 })
    }

    const projectDir = path.join(os.tmpdir(), 'code-genesis', projectId)

    // Only patch if the project directory exists (i.e. has been Run)
    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ ok: true, patched: 0, message: 'Project not running — changes saved to DB only' })
    }

    let patched = 0
    for (const change of changes) {
      const filePath = path.join(projectDir, change.path.replace(/^\//, ''))
      const dir = path.dirname(filePath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, ensureClientDirective(change.content, change.path), 'utf-8')
      patched++
    }

    return NextResponse.json({ ok: true, patched })
  } catch (err) {
    console.error('[/api/project/patch]', err)
    return NextResponse.json({ error: 'Patch failed' }, { status: 500 })
  }
}
