'use client'

import { useAutoFixStore } from '@/store/useAutoFixStore'
import { cn } from '@/lib/utils'
import { Wrench, CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react'

export function AutoFixFeed() {
  const { running, steps, attempt, maxAttempts, resolved, lastError } = useAutoFixStore()

  if (!running && steps.length === 0) return null

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
          {running
            ? <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            : resolved
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : <Wrench className="w-3.5 h-3.5 text-violet-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {running ? 'Auto-fix agent working…' : resolved ? 'Auto-fix complete' : 'Auto-fix finished'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {running ? `Attempt ${attempt} of ${maxAttempts}` : resolved ? 'Preview is running' : 'Could not fully resolve'}
          </p>
        </div>
      </div>

      {/* Error preview */}
      {lastError && (
        <div className="rounded-lg bg-zinc-950 border border-border p-2 max-h-20 overflow-y-auto">
          <p className="text-[10px] font-mono text-red-400/80 leading-relaxed whitespace-pre-wrap">
            {lastError.split('\n').slice(-4).join('\n')}
          </p>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5">
              {step.status === 'active' && <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />}
              {step.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              {step.status === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
              {step.status === 'pending' && <Circle className="w-3 h-3 text-muted-foreground/40" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[11px] leading-tight',
                step.status === 'error' ? 'text-red-400' : step.status === 'done' ? 'text-foreground/80' : 'text-foreground')}>
                {step.label}
              </p>
              {step.detail && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed break-words line-clamp-2">
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
