'use client'

import { Check, Bug } from 'lucide-react'
import { useState } from 'react'
import { useIDEStore } from '@/store/useIDEStore'

export function RootCauseCard() {
  const [applied, setApplied] = useState(false)
  const { debuggerResult } = useIDEStore()

  if (!debuggerResult) {
    return (
      <div className="rounded-xl border border-border bg-muted/10 p-4 flex flex-col items-center gap-2 text-center">
        <Bug className="w-5 h-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Run the Debugger to see root cause analysis here.</p>
      </div>
    )
  }

  const { rootCause, explanation, confidence } = debuggerResult

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Root Cause</p>
        <p className="text-sm font-bold text-red-300">{rootCause}</p>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{explanation}</p>
      <div className="flex gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
          Confidence: {confidence}%
        </span>
      </div>
      <button
        onClick={() => setApplied(true)}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
          applied
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-emerald-600 text-white hover:bg-emerald-500'
        }`}
      >
        <Check className="w-3.5 h-3.5" />
        {applied ? 'Applied!' : 'Apply Fix'}
      </button>
    </div>
  )
}
