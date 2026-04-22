'use client'

import type { ProjectFile } from '@/types'
import { MonacoEditor } from '@/components/shared/MonacoEditor'

const NOTE = `// 📌 Live diagram rendering available in full version (uses Mermaid.js)
// Below is the raw Mermaid DSL — copy into https://mermaid.live to preview

`

interface DiagramViewerProps {
  diagram: string
}

export function DiagramViewer({ diagram }: DiagramViewerProps) {
  const file: ProjectFile = {
    id: 'diagram',
    path: 'architecture.mermaid',
    language: 'markdown',
    content: NOTE + diagram,
  }

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2 mb-2 shrink-0">
        <p className="text-xs text-blue-400">
          💡 Live diagram rendering coming in full version. Copy the code below into{' '}
          <a href="https://mermaid.live" target="_blank" rel="noreferrer" className="underline">
            mermaid.live
          </a>{' '}
          to preview.
        </p>
      </div>
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border">
        <MonacoEditor file={file} readOnly />
      </div>
    </div>
  )
}
