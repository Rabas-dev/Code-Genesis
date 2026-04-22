'use client'

import { useState } from 'react'
import { fakeCodeAnalysis } from '@/lib/fakeData'
import type { CodeAnalysis, ProjectFile } from '@/types'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import { IssueList } from './IssueList'
import { Loader2 } from 'lucide-react'

const PLACEHOLDER_FILE: ProjectFile = {
  id: 'judge-scratch',
  path: 'paste-code-here.ts',
  language: 'typescript',
  content: `// Paste your code here to analyze it
// Click "Analyze Code" to get a full quality report

export async function getUserById(userId: string) {
  const user = await db.$queryRaw(
    \`SELECT * FROM users WHERE id = '\${userId}'\`
  )
  return user
}`,
}

export function JudgePanel() {
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<ProjectFile>(PLACEHOLDER_FILE)

  const handleAnalyze = () => {
    setLoading(true)
    setTimeout(() => {
      setAnalysis(fakeCodeAnalysis)
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: Code editor */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paste Code to Analyze
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <MonacoEditor
              file={file}
              readOnly={false}
              onChange={(val) => setFile({ ...file, content: val })}
            />
          </div>
          <div className="p-3 border-t border-border shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                '⚖️ Analyze Code'
              )}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-96 flex flex-col overflow-hidden">
          {!analysis && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
              <span className="text-4xl">⚖️</span>
              <p className="text-sm font-medium text-center">Paste your code and click Analyze to get a full quality report</p>
            </div>
          )}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-sm">Running AI analysis…</p>
            </div>
          )}
          {analysis && !loading && (
            <div className="flex-1 overflow-y-auto p-3">
              <IssueList issues={analysis.issues} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
