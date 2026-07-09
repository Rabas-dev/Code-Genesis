'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { useLLMStore } from '@/store/useLLMStore'
import type { CodeJudgeResult, JudgeIssue } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Gauge, RefreshCw, Loader2, ShieldCheck, Zap, Code2, Network,
  XCircle, AlertTriangle, Info, CheckCircle2, FileCode2,
} from 'lucide-react'

const SEVERITY: Record<JudgeIssue['severity'], { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
}

const CATEGORY_META = [
  { key: 'security', label: 'Security', icon: ShieldCheck },
  { key: 'performance', label: 'Performance', icon: Zap },
  { key: 'quality', label: 'Code Quality', icon: Code2 },
  { key: 'architecture', label: 'Architecture', icon: Network },
] as const

function scoreColor(s: number) {
  return s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-red-400'
}
function scoreStroke(s: number) {
  return s >= 80 ? '#34d399' : s >= 60 ? '#fbbf24' : '#f87171'
}

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={scoreStroke(score)} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold tabular-nums', scoreColor(score))}>{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

export function QualityPanel() {
  const { generatedFiles, codeVersion } = useGenerationStore()
  const { currentProject } = useIDEStore()
  const [result, setResult] = useState<CodeJudgeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoPending, setAutoPending] = useState(false)
  const didAutoRun = useRef(false)
  const rescoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allFiles = generatedFiles.length > 0 ? generatedFiles : (currentProject?.files ?? [])

  const analyze = useCallback(async () => {
    if (!allFiles.length || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: allFiles.map((f) => ({ path: f.path, content: f.content })),
          providers: useLLMStore.getState().getActiveProviders(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }, [allFiles, loading])

  // Auto-run once when the panel opens with files present
  useEffect(() => {
    if (!didAutoRun.current && allFiles.length > 0 && !result) {
      didAutoRun.current = true
      analyze()
    }
  }, [allFiles.length, result, analyze])

  // Re-score automatically (debounced) when the code changes via Chat or save.
  // Skips the very first version so it doesn't double-run with the initial auto-run.
  const lastScoredVersion = useRef(codeVersion)
  useEffect(() => {
    if (codeVersion === lastScoredVersion.current) return
    lastScoredVersion.current = codeVersion
    if (!allFiles.length) return
    setAutoPending(true)
    if (rescoreTimer.current) clearTimeout(rescoreTimer.current)
    rescoreTimer.current = setTimeout(() => {
      setAutoPending(false)
      analyze()
    }, 2500) // debounce — wait for edits to settle before spending an API call
    return () => { if (rescoreTimer.current) clearTimeout(rescoreTimer.current) }
  }, [codeVersion, allFiles.length, analyze])

  // ── Empty state ──
  if (!allFiles.length) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Gauge className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium">Code Quality Score</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Generate a project first — this panel will automatically rate the whole codebase and surface issues.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 px-4 h-11 border-b border-border bg-muted/20">
        <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
          <Gauge className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-none">Code Quality</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {autoPending ? 'Code changed — re-scoring shortly…' : `${allFiles.length} files analyzed by AI`}
          </p>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 text-white text-xs font-semibold transition-colors press disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Analyzing…' : 'Re-analyze'}
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-6">
          {loading && !result && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is reviewing your codebase…</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {result && (
            <>
              {/* Score + verdict */}
              <div className="flex items-center gap-6">
                <ScoreRing score={result.overallScore} />
                <div className="space-y-2 flex-1">
                  <div className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border',
                    result.verdict === 'excellent' || result.verdict === 'good'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : result.verdict === 'needs-improvement'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                  )}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {result.verdict.replace('-', ' ')}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} found across {allFiles.length} files.
                  </p>
                </div>
              </div>

              {/* Category scores */}
              <div className="grid grid-cols-2 gap-3">
                {CATEGORY_META.map(({ key, label, icon: Icon }) => {
                  const s = result.scores[key]
                  return (
                    <div key={key} className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('w-3.5 h-3.5', scoreColor(s))} />
                        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                        <span className={cn('ml-auto text-sm font-bold tabular-nums', scoreColor(s))}>{s}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${s}%`, backgroundColor: scoreStroke(s) }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Issues */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Issues ({result.issues.length})
                </p>
                {result.issues.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    No issues found — clean codebase!
                  </div>
                ) : (
                  result.issues.map((issue) => {
                    const sev = SEVERITY[issue.severity]
                    const Icon = sev.icon
                    return (
                      <div key={issue.id} className={cn('rounded-xl border p-3 space-y-1.5', sev.bg)}>
                        <div className="flex items-start gap-2">
                          <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', sev.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold">{issue.title}</span>
                              <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground">
                                {issue.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/70 mt-1 leading-relaxed">{issue.description}</p>
                            {issue.suggestion && (
                              <p className="text-[11px] text-emerald-400/80 mt-1 leading-relaxed flex items-start gap-1">
                                <FileCode2 className="w-3 h-3 shrink-0 mt-0.5" />
                                {issue.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
