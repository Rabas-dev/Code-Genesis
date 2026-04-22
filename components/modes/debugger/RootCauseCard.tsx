'use client'

import { fakeRootCause } from '@/lib/fakeData'
import { Check, MessageCircle, X } from 'lucide-react'
import { useState } from 'react'

export function RootCauseCard() {
  const [applied, setApplied] = useState(false)
  const { title, explanation, confidence } = fakeRootCause

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Root Cause</p>
        <p className="text-sm font-bold text-red-300">{title}</p>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{explanation}</p>
      <div className="flex gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
          <Check className="w-3 h-3" />
          Fix Applied
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
          Confidence: {confidence}%
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setApplied(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            applied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {applied ? 'Applied!' : 'Apply Fix'}
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:bg-muted transition-colors">
          <MessageCircle className="w-3.5 h-3.5" />
          Explain More
        </button>
      </div>
    </div>
  )
}
