import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

// ── Local import repair + missing-file stubs ──────────────────────────────────
// The LLM sometimes (a) imports a local file it forgot to generate, or
// (b) writes a relative path with the wrong depth (e.g. `../../data/x.json`
// from a root-level `components/` file, which escapes the project). Both break
// the build. This pass repairs over-deep paths and stubs missing data files.

const RESOLVE_EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '.json', '.css', '/index.tsx', '/index.ts', '/index.js']

function resolves(target: string, generated: Set<string>): boolean {
  return RESOLVE_EXTS.some((ext) => generated.has(target + ext))
}

function stubFor(p: string): string | null {
  if (p.endsWith('.json')) return '[]\n'              // safest default for data imports
  if (p.endsWith('.css')) return '/* auto-generated stub */\n'
  return null                                          // don't stub code modules (named exports unknown)
}

// Returns possibly-rewritten content + any stub files that must be created.
function repairLocalImports(
  content: string,
  filePath: string,
  generated: Set<string>,
): { content: string; stubs: { path: string; content: string }[] } {
  const ext = path.extname(filePath)
  if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) return { content, stubs: [] }

  const dir = path.posix.dirname(filePath.replace(/^\//, ''))
  const stubs: { path: string; content: string }[] = []
  let out = content

  const importRe = /(from\s+|import\s+|require\(\s*)(['"])(\.[^'"]+)\2/g
  out = out.replace(importRe, (full, kw, quote, spec) => {
    let resolved = path.posix.normalize(path.posix.join(dir, spec))

    // (a) Repair over-deep paths that escape the project root by trimming `../`
    if (resolved.startsWith('..')) {
      let trimmed = spec
      for (let i = 0; i < 3 && trimmed.startsWith('../'); i++) {
        trimmed = trimmed.replace('../', '')
        const candidate = path.posix.normalize(path.posix.join(dir, trimmed))
        if (!candidate.startsWith('..') && (resolves(candidate, generated) || stubFor(candidate))) {
          spec = trimmed
          resolved = candidate
          break
        }
      }
    }

    if (resolved.startsWith('..')) return full // still escapes — leave it, prompt handles it

    // (b) Missing file → stub it if it's a data/style import
    if (!resolves(resolved, generated)) {
      const stub = stubFor(resolved)
      if (stub) {
        stubs.push({ path: resolved, content: stub })
        generated.add(resolved)
      }
    }
    return `${kw}${quote}${spec}${quote}`
  })

  return { content: out, stubs }
}

// ── 'use client' auto-injection ───────────────────────────────────────────────
const CLIENT_HOOKS = [
  'useState', 'useEffect', 'useRef', 'useCallback', 'useMemo',
  'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle',
  'useTransition', 'useDeferredValue', 'useId', 'useSyncExternalStore',
  'useRouter', 'usePathname', 'useSearchParams', 'useParams',
]
const CLIENT_HOOK_RE = new RegExp(`\\b(${CLIENT_HOOKS.join('|')})\\s*\\(`)
const BROWSER_API_RE = /\b(window|document|localStorage|sessionStorage|navigator)\b/

function ensureClientDirective(content: string, filePath: string): string {
  const ext = path.extname(filePath)
  if (!['.tsx', '.jsx', '.ts', '.js'].includes(ext)) return content
  if (/^['"]use client['"]/.test(content.trimStart())) return content
  if (filePath.includes('/api/') || filePath.endsWith('route.ts') || filePath.endsWith('route.tsx')) return content
  if (filePath.endsWith('layout.tsx') && !CLIENT_HOOK_RE.test(content) && !BROWSER_API_RE.test(content)) return content
  if (CLIENT_HOOK_RE.test(content) || BROWSER_API_RE.test(content)) {
    return `'use client'\n\n${content}`
  }
  return content
}

// ── External import scanner ───────────────────────────────────────────────────
// Built-in Node.js modules and known framework packages that don't need installing
const BUILTINS = new Set([
  'react', 'next', 'react-dom', 'typescript',
  'fs', 'path', 'os', 'http', 'https', 'url', 'crypto', 'stream',
  'buffer', 'events', 'util', 'assert', 'child_process', 'net',
])

// Packages already provided by the scaffold/template — never re-add these.
const SCAFFOLD_PACKAGES = new Set([
  'next', 'react', 'react-dom', 'typescript', 'tailwindcss',
  'postcss', 'autoprefixer', '@types/node', '@types/react', '@types/react-dom',
])

function extractExternalImports(content: string): string[] {
  const packages = new Set<string>()
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const raw = m[1]
      // Skip relative imports and TS path aliases (@/..., ~/...) — these are NOT npm packages
      if (raw.startsWith('.') || raw.startsWith('/') || raw.startsWith('@/') || raw.startsWith('~/')) continue
      // A real scoped package is @scope/name with a non-empty scope
      const isScoped = raw.startsWith('@') && raw.indexOf('/') > 1
      const pkg = isScoped ? raw.split('/').slice(0, 2).join('/') : raw.split('/')[0]
      // Guard against malformed names like "@" or empty
      if (!pkg || pkg === '@') continue
      if (BUILTINS.has(pkg) || SCAFFOLD_PACKAGES.has(pkg)) continue
      packages.add(pkg)
    }
  }
  return Array.from(packages)
}

function patchPackageJson(projectDir: string, extraPackages: string[]) {
  if (extraPackages.length === 0) return

  const pkgPath = path.join(projectDir, 'package.json')
  if (!fs.existsSync(pkgPath)) return

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    let changed = false
    for (const dep of extraPackages) {
      if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
        pkg.dependencies = pkg.dependencies ?? {}
        pkg.dependencies[dep] = 'latest'
        changed = true
      }
    }
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8')
      console.log(`[/api/project/write] Added to package.json: ${extraPackages.join(', ')}`)
    }
  } catch { /* ignore malformed package.json */ }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, files } = await req.json()

    if (!projectId || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Missing projectId or files' }, { status: 400 })
    }

    const projectDir = path.join(os.tmpdir(), 'code-genesis', projectId)
    fs.mkdirSync(projectDir, { recursive: true })

    // First pass — collect all external imports across all files
    const allExternalPackages = new Set<string>()
    for (const file of files as { path: string; content: string }[]) {
      const ext = path.extname(file.path)
      if (['.tsx', '.jsx', '.ts', '.js'].includes(ext)) {
        for (const pkg of extractExternalImports(file.content)) {
          allExternalPackages.add(pkg)
        }
      }
    }

    // Set of all generated paths — used to detect missing local imports
    const generatedPaths = new Set(
      (files as { path: string }[]).map((f) => f.path.replace(/^\//, ''))
    )

    // Second pass — write files with auto-fixes
    let clientFixed = 0
    const stubFiles = new Map<string, string>()
    for (const file of files as { path: string; content: string }[]) {
      const filePath = path.join(projectDir, file.path.replace(/^\//, ''))
      fs.mkdirSync(path.dirname(filePath), { recursive: true })

      // Repair broken relative imports + collect any data/style stubs to create
      const { content: repaired, stubs } = repairLocalImports(file.content, file.path, generatedPaths)
      for (const s of stubs) if (!stubFiles.has(s.path)) stubFiles.set(s.path, s.content)

      const patched = ensureClientDirective(repaired, file.path)
      if (patched !== file.content) clientFixed++
      fs.writeFileSync(filePath, patched, 'utf-8')
    }

    // Create any missing data/style stub files referenced by imports
    for (const [p, content] of stubFiles) {
      const fp = path.join(projectDir, p)
      fs.mkdirSync(path.dirname(fp), { recursive: true })
      if (!fs.existsSync(fp)) fs.writeFileSync(fp, content, 'utf-8')
    }

    // Patch package.json with any missing external packages
    patchPackageJson(projectDir, Array.from(allExternalPackages))

    if (clientFixed > 0) console.log(`[/api/project/write] Auto-added 'use client' to ${clientFixed} file(s)`)
    if (stubFiles.size > 0) console.log(`[/api/project/write] Created ${stubFiles.size} stub(s): ${[...stubFiles.keys()].join(', ')}`)

    return NextResponse.json({
      ok: true, dir: projectDir,
      count: files.length,
      clientFixed,
      stubs: [...stubFiles.keys()],
      extraPackages: Array.from(allExternalPackages),
    })
  } catch (err) {
    console.error('[/api/project/write]', err)
    return NextResponse.json({ error: 'Write failed' }, { status: 500 })
  }
}
