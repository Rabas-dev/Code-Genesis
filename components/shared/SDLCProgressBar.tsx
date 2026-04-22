'use client'

import { sdlcSteps } from '@/lib/fakeData'
import { useGenerationStore } from '@/store/useGenerationStore'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SDLCProgressBar() {
  const { sdlcPhase, status, progress } = useGenerationStore()

  return (
    <div className="w-full bg-background/80 backdrop-blur border-b border-border px-6 py-2">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {sdlcSteps.map((step, idx) => {
          const isComplete = sdlcPhase > idx || status === 'complete'
          const isActive = sdlcPhase === idx && status === 'generating'
          const isPending = sdlcPhase < idx && status !== 'complete'

          // within-phase fill for active
          const phaseProgress = isActive
            ? (() => {
                // figure out which step range maps to current phase
                const stepObj = sdlcSteps[idx]
                return stepObj ? Math.min(100, ((progress / 100) * 5 - idx) * 100) : 0
              })()
            : 0

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1 relative">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2',
                    isComplete
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : isActive
                        ? 'border-violet-500 text-violet-400 bg-violet-500/10 shadow-lg shadow-violet-500/20 animate-pulse-slow'
                        : 'border-border text-muted-foreground bg-muted/30'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="text-xs">{step.icon}</span>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'text-[10px] font-semibold whitespace-nowrap transition-colors',
                      isComplete
                        ? 'text-emerald-400'
                        : isActive
                          ? 'text-violet-400'
                          : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {/* Connector track */}
              {idx < sdlcSteps.length - 1 && (
                <div className="relative flex-1 h-0.5 mx-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-700',
                      isComplete ? 'bg-emerald-500 w-full' : 'bg-violet-500'
                    )}
                    style={{
                      width: isComplete ? '100%' : isActive ? `${phaseProgress}%` : '0%',
                    }}
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
