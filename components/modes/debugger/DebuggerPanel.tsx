'use client'

import { useState } from 'react'
import { fakeHealingSteps, fakeBrokenCode, fakeFixedCode } from '@/lib/fakeData'
import type { HealingStep } from '@/types'
import { HealingLoop } from './HealingLoop'
import { CodeDiffViewer } from './CodeDiffViewer'
import { RootCauseCard } from './RootCauseCard'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import type { ProjectFile } from '@/types'
import { Loader2, Bug } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

const ERROR_PLACEHOLDER = `TypeError: Cannot read properties of undefined (reading 'findUnique')
    at getUserById (lib/db.ts:12:38)
    at GET (app/api/users/route.ts:8:24)
    at async NextNodeServer.handleRequest

[SQL Error] ECONNREFUSED connecting to database
  at Connection.connect (/node_modules/pg/lib/connection.js:54:17)

npm run dev
  ✗ Server startup failed after 3 retries`

export function DebuggerPanel() {
  const [errorText, setErrorText] = useState(ERROR_PLACEHOLDER)
  const [steps, setSteps] = useState<HealingStep[]>([])
  const [showDiff, setShowDiff] = useState(false)
  const [loading, setLoading] = useState(false)

  const brokenFile: ProjectFile = {
    id: 'broken',
    path: 'app/api/users/route.ts',
    language: 'typescript',
    content: fakeBrokenCode,
  }

  const handleDiagnose = () => {
    setLoading(true)
    setSteps([])
    setShowDiff(false)

    setTimeout(() => {
      setLoading(false)
      setSteps(fakeHealingSteps)
      setTimeout(() => setShowDiff(true), 800)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top: Code + Error inputs */}
      {!showDiff && (
        <div className="flex gap-0 flex-1 min-h-0">
          {/* Left: Broken code */}
          <div className="flex-1 min-w-0 border-r border-border flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paste Your Code</p>
            </div>
            <div className="flex-1 min-h-0">
              <MonacoEditor file={brokenFile} readOnly={false} />
            </div>
          </div>

          {/* Right: Error log */}
          <div className="w-96 flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Error Log</p>
            </div>
            <textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              className="flex-1 w-full font-mono text-xs bg-zinc-950 text-red-400 p-3 resize-none focus:outline-none leading-relaxed"
              placeholder="Paste your error stack trace here..."
            />
          </div>
        </div>
      )}

      {/* Show diff when available */}
      {showDiff && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <CodeDiffViewer />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Bottom: Diagnose button + Healing loop */}
      <div className="shrink-0 border-t border-border p-4 space-y-3">
        {steps.length > 0 && <HealingLoop steps={steps} />}
        <button
          onClick={handleDiagnose}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold hover:from-red-500 hover:to-rose-500 transition-all shadow-lg shadow-red-500/20 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Diagnosing…
            </>
          ) : (
            <>
              <Bug className="w-4 h-4" />
              Diagnose &amp; Fix
            </>
          )}
        </button>
      </div>
    </div>
  )
}
