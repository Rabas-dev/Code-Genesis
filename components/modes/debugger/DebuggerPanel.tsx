'use client'

import { useState, useRef } from 'react'
import type { DebuggerResult, ProjectFile } from '@/types'
import { HealingLoop } from './HealingLoop'
import { CodeDiffViewer } from './CodeDiffViewer'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import { Loader2, Bug, Upload, AlertTriangle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { HealingStep } from '@/types'
import { useLLMStore } from '@/store/useLLMStore'
import { useIDEStore } from '@/store/useIDEStore'

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'java', 'php']

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  high: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  critical: 'bg-red-500/10 border-red-500/20 text-red-400',
}

const HEALING_STEPS: HealingStep[] = [
  { step: 'run', label: 'Run Code', status: 'complete' },
  { step: 'detect', label: 'Detect Error', status: 'complete' },
  { step: 'analyze', label: 'Root Cause', status: 'complete' },
  { step: 'fix', label: 'Apply Fix', status: 'complete' },
  { step: 'rerun', label: 'Re-Run', status: 'complete' },
]

const PLACEHOLDER_CODE = `import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId')
  // ⚠️ No input validation
  // ⚠️ Raw SQL — SQL injection risk
  const user = await db.$queryRaw(
    \`SELECT * FROM users WHERE id = '\${userId}'\`
  )
  return NextResponse.json(user)
}
// ⚠️ Missing try/catch`

export function DebuggerPanel() {
  const [result, setResult] = useState<DebuggerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const { setDebuggerResult } = useIDEStore()
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [errorText, setErrorText] = useState('')
  const [file, setFile] = useState<ProjectFile>({
    id: 'broken', path: 'buggy-code.ts', language: 'typescript', content: PLACEHOLDER_CODE,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDiagnose = async () => {
    if (!file.content.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/debugger/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: file.content, error: errorText, language, providers: useLLMStore.getState().getActiveProviders() }),
      })
      if (!res.ok) throw new Error('Debug analysis failed')
      const data: DebuggerResult = await res.json()
      setResult(data)
      setDebuggerResult(data)
    } catch {
      setError('AI debug analysis failed. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split('.').pop() ?? 'ts'
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', go: 'go', rs: 'rust',
    }
    const detectedLang = langMap[ext] ?? 'plaintext'
    setLanguage(detectedLang)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFile({ id: 'uploaded', path: f.name, language: detectedLang, content: ev.target?.result as string })
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {!result ? (
        /* Input view */
        <div className="flex gap-0 flex-1 min-h-0">
          {/* Left: code */}
          <div className="flex-1 min-w-0 border-r border-border flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paste Your Code</p>
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value); setFile((f) => ({ ...f, language: e.target.value })) }}
                  className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground focus:outline-none"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
                  accept=".ts,.tsx,.js,.jsx,.py,.go,.rs" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MonacoEditor
                file={{ ...file, language }}
                readOnly={false}
                onChange={(val) => setFile((f) => ({ ...f, content: val }))}
              />
            </div>
          </div>

          {/* Right: error log + action */}
          <div className="w-96 flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Error Log <span className="normal-case font-normal">(optional)</span>
              </p>
            </div>
            <textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              className="flex-1 w-full font-mono text-xs bg-zinc-950 text-red-400 p-3 resize-none focus:outline-none leading-relaxed"
              placeholder="Paste your error stack trace here... (optional — AI will analyze the code even without an error)"
            />
            <div className="p-3 border-t border-border space-y-2 shrink-0">
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handleDiagnose}
                disabled={loading || !file.content.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-500/20 disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Diagnosing…</>
                ) : (
                  <><Bug className="w-4 h-4" /> Diagnose &amp; Fix</>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results view */
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header bar */}
          <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-3">
            <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border uppercase', SEVERITY_COLORS[result.severity] ?? '')}>
              {result.severity} severity
            </span>
            <span className="text-xs text-muted-foreground flex-1 truncate">{result.rootCause}</span>
            <span className="text-xs text-emerald-400 font-semibold shrink-0">{result.confidence}% confidence</span>
            <button
              onClick={() => setResult(null)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
            >
              New →
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Left: analysis */}
            <ScrollArea className="w-80 border-r border-border shrink-0">
              <div className="p-4 space-y-4">
                {/* Healing loop */}
                <HealingLoop steps={HEALING_STEPS} />

                {/* Root cause */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs font-semibold text-red-400">Root Cause</p>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{result.rootCause}</p>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explanation</p>
                  <p className="text-xs text-foreground/80 leading-relaxed">{result.explanation}</p>
                </div>

                {/* Fix strategy */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fix Strategy</p>
                  <p className="text-xs text-foreground/80">{result.fixStrategy.approach}</p>
                  <ul className="space-y-1">
                    {result.fixStrategy.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Steps to reproduce */}
                {result.stepsToReproduce && result.stepsToReproduce.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Steps to Reproduce</p>
                    <ol className="space-y-1">
                      {result.stepsToReproduce.map((step, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-violet-400 shrink-0">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Load fixed code button */}
                <button
                  onClick={() => setFile((f) => ({ ...f, content: result.fixedCode }))}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  Load Fixed Code into Editor
                </button>
              </div>
            </ScrollArea>

            {/* Right: diff */}
            <div className="flex-1 min-w-0 p-4 overflow-hidden">
              <CodeDiffViewer
                before={file.content}
                after={result.fixedCode}
                language={language}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
