'use client'

import { useState, useRef } from 'react'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import { IssueList } from './IssueList'
import { ScoreCard } from './ScoreCard'
import { Loader2, Upload } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CodeJudgeResult, ProjectFile } from '@/types'
import { useLLMStore } from '@/store/useLLMStore'

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust', 'css', 'html', 'java', 'php']

const PLACEHOLDER_FILE: ProjectFile = {
  id: 'judge-scratch',
  path: 'paste-code-here.ts',
  language: 'typescript',
  content: `// Paste your code here, then click "Analyze Code"

export async function getUserById(userId: string) {
  const user = await db.$queryRaw(
    \`SELECT * FROM users WHERE id = '\${userId}'\`
  )
  return user
}`,
}

export function JudgePanel() {
  const [result, setResult] = useState<CodeJudgeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [file, setFile] = useState<ProjectFile>(PLACEHOLDER_FILE)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAnalyze = async () => {
    if (!file.content.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/code-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: file.content, language, providers: useLLMStore.getState().getActiveProviders() }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      const data: CodeJudgeResult = await res.json()
      setResult(data)
    } catch {
      setError('AI analysis failed. Check your API key and try again.')
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
      py: 'python', go: 'go', rs: 'rust', css: 'css', html: 'html',
    }
    const detectedLang = langMap[ext] ?? 'plaintext'
    setLanguage(detectedLang)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setFile({ id: 'uploaded', path: f.name, language: detectedLang, content })
    }
    reader.readAsText(f)
    // reset input so the same file can be re-uploaded
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: code editor */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0 flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Code to Analyze
            </p>
            <div className="ml-auto flex items-center gap-2">
              {/* Language selector */}
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value)
                  setFile((f) => ({ ...f, language: e.target.value }))
                }}
                className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              {/* File upload */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
                accept=".ts,.tsx,.js,.jsx,.py,.go,.rs,.css,.html,.java,.php" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                <Upload className="w-3 h-3" />
                Upload File
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
          <div className="p-3 border-t border-border shrink-0 space-y-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleAnalyze}
              disabled={loading || !file.content.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : '⚖️ Analyze Code'}
            </button>
          </div>
        </div>

        {/* Right: results */}
        <div className="w-96 flex flex-col overflow-hidden">
          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
              <span className="text-4xl">⚖️</span>
              <p className="text-sm font-medium text-center">
                Paste or upload code, then click Analyze to get a full AI quality report
              </p>
            </div>
          )}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm">Running AI analysis…</p>
              <p className="text-xs text-muted-foreground/60">Checking security, performance, architecture…</p>
            </div>
          )}
          {result && !loading && (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                <ScoreCard result={result} />
                <IssueList issues={result.issues} />
                {result.improvedCode && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      ✅ Improved Version Available
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The AI has generated a corrected version of your code with all issues addressed.
                    </p>
                    <button
                      onClick={() => setFile((f) => ({ ...f, content: result.improvedCode! }))}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                    >
                      Load Fixed Code →
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}
