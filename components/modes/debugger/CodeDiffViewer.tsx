'use client'

import type { ProjectFile } from '@/types'
import { MonacoEditor } from '@/components/shared/MonacoEditor'

interface CodeDiffViewerProps {
  before: string
  after: string
  language?: string
}

export function CodeDiffViewer({ before, after, language = 'typescript' }: CodeDiffViewerProps) {
  const brokenFile: ProjectFile = {
    id: 'diff-broken',
    path: '❌ Original (Buggy)',
    language,
    content: before,
  }
  const fixedFile: ProjectFile = {
    id: 'diff-fixed',
    path: '✅ Fixed',
    language,
    content: after,
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Code Diff — Before / After
      </p>
      <div className="flex gap-3 h-80">
        <div className="flex-1 rounded-xl border border-red-500/30 overflow-hidden">
          <MonacoEditor file={brokenFile} readOnly />
        </div>
        <div className="flex-1 rounded-xl border border-emerald-500/30 overflow-hidden">
          <MonacoEditor file={fixedFile} readOnly />
        </div>
      </div>
    </div>
  )
}
