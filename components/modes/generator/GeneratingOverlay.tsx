'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { Check, Loader2, FileSearch, LayoutTemplate, Code2, TestTube, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

// IDs must match the sdlcPhase values set in useGenerationStore:
// 0=requirements, 1=architecture, 2=design, 3=implementation, 4=complete
const SDLC_STEPS = [
  { id: 0, label: 'Requirements', Icon: FileSearch },
  { id: 1, label: 'Architecture', Icon: LayoutTemplate },
  { id: 2, label: 'Design', Icon: TestTube },
  { id: 3, label: 'Implementation', Icon: Code2 },
  { id: 4, label: 'Deploy', Icon: Rocket },
]

export function GeneratingOverlay() {
  const { currentStep, progress, sdlcPhase } = useGenerationStore()
  const totalSteps = 12
  const currentStepNum = Math.round((progress / 100) * totalSteps)

  return (
    <div className="absolute inset-0 z-20 bg-background flex flex-col items-center justify-center gap-8 px-8">
      {/* Spinner */}
      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
      </div>

      {/* Step text */}
      <div className="text-center space-y-1.5 max-w-md">
        <p className="text-base font-semibold text-foreground leading-snug">
          {currentStep || 'Initializing…'}
        </p>
        <p className="text-xs text-muted-foreground">
          Step {Math.min(currentStepNum + 1, totalSteps)} of {totalSteps}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase steps */}
      <div className="flex items-center gap-3">
        {SDLC_STEPS.map((step, idx) => {
          const isComplete = sdlcPhase > step.id || progress >= 100
          const isActive = sdlcPhase === step.id

          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300',
                  isComplete
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : isActive
                      ? 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/40'
                      : 'bg-muted/50 text-muted-foreground/30'
                )}
              >
                {isComplete
                  ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  : <step.Icon className="w-3.5 h-3.5" />
                }
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive ? 'text-violet-400' : isComplete ? 'text-emerald-400' : 'text-muted-foreground/30'
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
