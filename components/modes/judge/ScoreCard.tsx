import type { CodeAnalysis } from '@/types'
import { cn } from '@/lib/utils'

interface ScoreCardProps {
  analysis: CodeAnalysis
}

function getScoreColor(score: number) {
  if (score >= 75) return { text: 'text-emerald-400', track: '#10b981', bg: 'bg-emerald-500/10' }
  if (score >= 50) return { text: 'text-amber-400', track: '#f59e0b', bg: 'bg-amber-500/10' }
  return { text: 'text-red-400', track: '#ef4444', bg: 'bg-red-500/10' }
}

interface MiniScoreProps {
  label: string
  score: number
}

function MiniScore({ label, score }: MiniScoreProps) {
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

export function ScoreCard({ analysis }: ScoreCardProps) {
  const { overallScore, securityScore, performanceScore, qualityScore, architectureScore } = analysis
  const color = getScoreColor(overallScore)
  const pct = overallScore / 100
  const conicVal = `conic-gradient(${color.track} 0deg, ${color.track} ${pct * 360}deg, #27272a ${pct * 360}deg)`

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      {/* Circle score */}
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
        <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
          Overall Quality Score
        </p>
      </div>

      {/* Sub-scores */}
      <div className="space-y-2">
        <MiniScore label="Security" score={securityScore} />
        <MiniScore label="Performance" score={performanceScore} />
        <MiniScore label="Quality" score={qualityScore} />
        <MiniScore label="Architecture" score={architectureScore} />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
        {analysis.summary}
      </p>
    </div>
  )
}
