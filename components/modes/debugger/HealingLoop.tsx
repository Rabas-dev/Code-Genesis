import type { HealingStep } from '@/types'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEP_ICONS: Record<HealingStep['step'], string> = {
  run: '▶',
  detect: '🔍',
  analyze: '🧠',
  fix: '🔧',
  rerun: '✓',
}

interface HealingLoopProps {
  steps: HealingStep[]
}

export function HealingLoop({ steps }: HealingLoopProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => (
        <div key={step.step} className="flex items-center flex-1">
          {/* Step node */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-500',
                step.status === 'complete'
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : step.status === 'active'
                    ? 'border-red-500 bg-red-500/10 text-red-400 animate-pulse'
                    : step.status === 'failed'
                      ? 'bg-red-700 border-red-700 text-white'
                      : 'border-border bg-muted/30 text-muted-foreground'
              )}
            >
              {step.status === 'complete' ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : step.status === 'failed' ? (
                <X className="w-3.5 h-3.5" />
              ) : step.status === 'active' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="text-[10px]">{STEP_ICONS[step.step]}</span>
              )}
            </div>
            <span
              className={cn(
                'text-[9px] font-medium whitespace-nowrap',
                step.status === 'complete'
                  ? 'text-emerald-400'
                  : step.status === 'active'
                    ? 'text-red-400'
                    : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector */}
          {idx < steps.length - 1 && (
            <div className="flex-1 h-0.5 mx-1 bg-border rounded-full overflow-hidden mb-3">
              <div
                className={cn(
                  'h-full rounded-full',
                  step.status === 'complete' ? 'w-full bg-emerald-500' : 'w-0'
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
