import type { SeniorVerdict } from '@/types'
import { cn } from '@/lib/utils'

const VERDICT_CONFIG: Record<SeniorVerdict, { emoji: string; title: string; subtitle: string; cls: string }> = {
  pass: {
    emoji: '✅',
    title: 'Would Pass Senior Review',
    subtitle: 'Code meets production quality standards.',
    cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  },
  maybe: {
    emoji: '⚠️',
    title: 'Would Conditionally Pass Senior Review',
    subtitle: 'Some issues need addressing before merge.',
    cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  },
  fail: {
    emoji: '❌',
    title: 'Would Not Pass Senior Review',
    subtitle: 'Critical issues must be resolved before this can merge.',
    cls: 'bg-red-500/10 border-red-500/30 text-red-300',
  },
}

interface SeniorReviewBadgeProps {
  verdict: SeniorVerdict
}

export function SeniorReviewBadge({ verdict }: SeniorReviewBadgeProps) {
  const config = VERDICT_CONFIG[verdict]
  return (
    <div className={cn('rounded-xl border p-3.5 space-y-1', config.cls)}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.emoji}</span>
        <p className="text-sm font-semibold leading-tight">{config.title}</p>
      </div>
      <p className="text-xs opacity-75 pl-7">{config.subtitle}</p>
    </div>
  )
}
