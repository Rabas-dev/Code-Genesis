'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 0, label: 'Requirements' },
  { id: 1, label: 'Architecture' },
  { id: 2, label: 'Design' },
  { id: 3, label: 'Implementation' },
  { id: 4, label: 'Deploy' },
]

export function SDLCProgressBar() {
  const { sdlcPhase, status, progress } = useGenerationStore()

  return (
    <div className="w-full bg-background border-b border-border px-6 py-2 shrink-0">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {STEPS.map((step, idx) => {
          const isComplete = sdlcPhase > idx || status === 'complete'
          const isActive = sdlcPhase === idx && status === 'generating'

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-300',
                    isComplete
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isActive
                        ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                        : 'border-border text-muted-foreground/50 bg-transparent'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium whitespace-nowrap transition-colors',
                    isComplete ? 'text-emerald-400' : isActive ? 'text-violet-400' : 'text-muted-foreground/40'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2 bg-border overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isComplete ? 'bg-emerald-500 w-full' : isActive ? 'bg-violet-500' : 'bg-transparent'
                    )}
                    style={{ width: isActive ? `${Math.max(0, (progress / 100) * 5 - idx) * 100}%` : isComplete ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
