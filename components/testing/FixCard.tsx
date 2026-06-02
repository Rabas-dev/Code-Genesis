'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, FileCode2, Loader2, Wand2 } from 'lucide-react'
import { useTestStore } from '@/store/useTestStore'
import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { createClient } from '@/lib/supabase/client'
import type { CodeFix } from '@/lib/testing/fixer'
import { cn } from '@/lib/utils'

interface Props {
  fix: CodeFix
  index: number
}

export function FixCard({ fix, index }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [applying, setApplying] = useState(false)
  const { appliedFixes, markFixApplied } = useTestStore()
  const { setSelectedFile, selectedFile, currentProject } = useIDEStore()
  const { generatedFiles } = useGenerationStore()
  const supabase = createClient()

  const isApplied = appliedFixes.has(fix.filePath)
  const allFiles = generatedFiles.length > 0 ? generatedFiles : (currentProject?.files ?? [])

  const handleApply = async () => {
    setApplying(true)
    try {
      const file = allFiles.find((f) => f.path.replace(/^\//, '') === fix.filePath.replace(/^\//, ''))
      if (file?.id) {
        await supabase.from('project_files').update({ content: fix.fixedContent }).eq('id', file.id)
        // Patch running project on disk
        if (currentProject?.id) {
          await fetch('/api/project/patch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: currentProject.id,
              changes: [{ path: fix.filePath, content: fix.fixedContent }],
            }),
          })
        }
        // Refresh editor if this file is open
        if (selectedFile?.id === file.id) {
          setSelectedFile({ ...selectedFile, content: fix.fixedContent })
        }
      }
      markFixApplied(fix.filePath)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      isApplied ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-card'
    )}>
      <div className="flex items-start gap-2.5 p-3">
        <div className={cn(
          'w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5',
          isApplied ? 'bg-emerald-500/20' : 'bg-violet-500/15'
        )}>
          {isApplied
            ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            : <Wand2 className="w-3 h-3 text-violet-400" />}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <FileCode2 className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            <span className="text-[10px] font-mono text-muted-foreground/70 truncate">{fix.filePath}</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{fix.reason}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="View diff"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleApply}
            disabled={isApplied || applying}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all press',
              isApplied
                ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            )}
          >
            {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {isApplied ? 'Applied' : applying ? 'Applying…' : `Apply Fix ${index + 1}`}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border overflow-auto max-h-64">
          <pre className="text-[10px] font-mono p-3 text-emerald-300/80 leading-relaxed whitespace-pre-wrap bg-zinc-950">
            {fix.fixedContent.slice(0, 3000)}{fix.fixedContent.length > 3000 ? '\n… (truncated)' : ''}
          </pre>
        </div>
      )}
    </div>
  )
}
