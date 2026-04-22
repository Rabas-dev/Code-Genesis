'use client'

import { fakeBrokenCode, fakeFixedCode } from '@/lib/fakeData'
import type { ProjectFile } from '@/types'
import { MonacoEditor } from '@/components/shared/MonacoEditor'

const brokenFile: ProjectFile = {
  id: 'diff-broken',
  path: '❌ Before (Vulnerable)',
  language: 'typescript',
  content: fakeBrokenCode,
}

const fixedFile: ProjectFile = {
  id: 'diff-fixed',
  path: '✅ After (Secure)',
  language: 'typescript',
  content: fakeFixedCode,
}

export function CodeDiffViewer() {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Code Diff
      </p>
      <div className="flex gap-3 h-72">
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
