import type { CodeJudgeResult } from '@/types'
import { cn } from '@/lib/utils'

function getScoreColor(score: number) {
  if (score >= 75) return { text: 'text-emerald-400', track: '#10b981' }
  if (score >= 50) return { text: 'text-amber-400', track: '#f59e0b' }
  return { text: 'text-red-400', track: '#ef4444' }
}

function MiniScore({ label, score }: { label: string; score: number }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: color.track }}
          />
        </div>
        <span className={cn('font-semibold w-6 text-right', color.text)}>{score}</span>
      </div>
    </div>
  )
}

const VERDICT_CONFIG: Record<CodeJudgeResult['verdict'], { label: string; cls: string; emoji: string }> = {
  excellent: { label: 'Excellent — Ship it', emoji: '✅', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
  good: { label: 'Good — Minor fixes suggested', emoji: '👍', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
  'needs-improvement': { label: 'Needs improvement before merge', emoji: '⚠️', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  poor: { label: 'Would not pass review', emoji: '❌', cls: 'bg-red-500/10 border-red-500/30 text-red-300' },
}

export function ScoreCard({ result }: { result: CodeJudgeResult }) {
  const { overallScore, scores, verdict } = result
  const color = getScoreColor(overallScore)
  const pct = overallScore / 100
  const conicVal = `conic-gradient(${color.track} 0deg, ${color.track} ${pct * 360}deg, #27272a ${pct * 360}deg)`
  const v = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG['needs-improvement']

  return (
    <div className="space-y-3">
      {/* Verdict badge */}
      <div className={cn('rounded-xl border p-3 flex items-center gap-2.5', v.cls)}>
        <span className="text-lg">{v.emoji}</span>
        <p className="text-sm font-semibold">{v.label}</p>
      </div>

      {/* Score ring + sub-scores */}
      <div className="rounded-xl border border-border p-4 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: conicVal, padding: '3px' }}
          >
            <div className="w-full h-full rounded-full bg-background flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-black', color.text)}>{overallScore}</span>
              <span className="text-[9px] text-muted-foreground">/100</span>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Score</p>
        </div>

        <div className="space-y-2">
          <MiniScore label="Security" score={scores.security} />
          <MiniScore label="Performance" score={scores.performance} />
          <MiniScore label="Quality" score={scores.quality} />
          <MiniScore label="Architecture" score={scores.architecture} />
        </div>
      </div>
    </div>
  )
}
