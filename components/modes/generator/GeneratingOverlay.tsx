'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { sdlcSteps } from '@/lib/fakeData'
import { Loader2, Check } from 'lucide-react'
import { SDLCProgressBar } from '@/components/shared/SDLCProgressBar'
import { cn } from '@/lib/utils'

export function GeneratingOverlay() {
  const { currentStep, progress, sdlcPhase } = useGenerationStore()
  const totalSteps = 12
  const currentStepNum = Math.round((progress / 100) * totalSteps)

  return (
    <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-sm flex flex-col">
      {/* SDLC bar in overlay */}
      <div className="p-6 pb-4">
        <SDLCProgressBar />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/40">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 animate-pulse" />
        </div>

        {/* Step message */}
        <div className="text-center space-y-2 max-w-md">
          <p className="text-xl font-semibold text-foreground leading-snug">{currentStep}</p>
          <p className="text-sm text-muted-foreground">
            Step {Math.min(currentStepNum + 1, totalSteps)} of {totalSteps}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Phase steps mini list */}
        <div className="grid grid-cols-5 gap-3 w-full max-w-md">
          {sdlcSteps.map((step) => {
            const isComplete = sdlcPhase > step.id || progress >= 100
            const isActive = sdlcPhase === step.id

            return (
              <div key={step.id} className="flex flex-col items-center gap-1 text-center">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-500',
                    isComplete
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isActive
                        ? 'bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/40'
                        : 'bg-muted/50 text-muted-foreground/50'
                  )}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : <span>{step.icon}</span>}
                </div>
                <span className={cn('text-[10px] font-medium', isActive ? 'text-violet-400' : isComplete ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
