'use client'

import { useState } from 'react'
import { useTestStore } from '@/store/useTestStore'
import { useIDEStore } from '@/store/useIDEStore'
import { FixCard } from './FixCard'
import { ScreenshotPreview } from './ScreenshotPreview'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Play, Square, RotateCcw, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Camera, Globe, Zap, Server, ChevronDown, ChevronRight,
  Info,
} from 'lucide-react'
import type { RouteResult, TestFinding } from '@/store/useTestStore'

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
  const bg = score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : score >= 60 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold', bg, color)}>
      <Zap className="w-2.5 h-2.5" />
      {score}/100
    </span>
  )
}

function SeverityIcon({ severity }: { severity: TestFinding['severity'] }) {
  if (severity === 'critical') return <XCircle className="w-3 h-3 text-red-400 shrink-0" />
  if (severity === 'warning') return <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
  return <Info className="w-3 h-3 text-blue-400 shrink-0" />
}

function RouteRow({ result, onScreenshot }: { result: RouteResult; onScreenshot: (s: string, r: string) => void }) {
  const [open, setOpen] = useState(false)
  const hasFail = result.status === 'fail' || result.status === 'error'

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {result.status === 'running' && <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />}
        {result.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
        {(result.status === 'fail' || result.status === 'error') && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        {result.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />}

        <span className="font-mono text-xs flex-1">{result.route || '/'}</span>

        {result.visualScore !== undefined && (
          <span className={cn('text-[10px] font-medium', result.visualScore >= 80 ? 'text-emerald-400' : result.visualScore >= 60 ? 'text-amber-400' : 'text-red-400')}>
            {result.visualScore}/100
          </span>
        )}
        {result.loadTimeMs !== undefined && (
          <span className="text-[10px] text-muted-foreground/50">{result.loadTimeMs}ms</span>
        )}
        {result.screenshot && (
          <button
            onClick={(e) => { e.stopPropagation(); onScreenshot(result.screenshot!, result.route) }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Camera className="w-3 h-3" />
          </button>
        )}
        {result.findings.length > 0 && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', hasFail ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400')}>
            {result.findings.length}
          </span>
        )}
        {result.findings.length > 0
          ? (open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />)
          : null}
      </button>

      {open && result.findings.length > 0 && (
        <div className="border-t border-border bg-muted/10 divide-y divide-border/40">
          {result.findings.map((f) => (
            <div key={f.id} className="flex items-start gap-2 px-3 py-1.5">
              <SeverityIcon severity={f.severity} />
              <span className="text-[11px] text-foreground/70 leading-relaxed">{f.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TestRunner() {
  const {
    isRunning, overallScore, routeResults, apiResults,
    fixes, logs, currentRoute, iteration, clearResults, startTest, stopTest,
  } = useTestStore()
  const { currentProject, previewPort } = useIDEStore()
  const [screenshot, setScreenshot] = useState<{ src: string; route: string } | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  const criticalCount = routeResults.flatMap((r) => r.findings).filter((f) => f.severity === 'critical').length
  const warningCount = routeResults.flatMap((r) => r.findings).filter((f) => f.severity === 'warning').length
  const passCount = routeResults.filter((r) => r.status === 'pass').length
  const failCount = routeResults.filter((r) => r.status === 'fail' || r.status === 'error').length

  const canTest = !!currentProject && !!previewPort
  const port = previewPort ?? 3001

  const handleRun = () => {
    if (!currentProject) return
    startTest(currentProject.id, port)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/10">
        {!isRunning ? (
          <button
            onClick={handleRun}
            disabled={!canTest}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all press',
              canTest ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Play className="w-3.5 h-3.5" />
            Run Tests
          </button>
        ) : (
          <button
            onClick={stopTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
        )}

        {!canTest && !isRunning && (
          <span className="text-[10px] text-muted-foreground/60">Click Run in terminal first to start the preview</span>
        )}

        {(overallScore !== null) && <ScoreBadge score={overallScore} />}

        {routeResults.length > 0 && (
          <div className="flex items-center gap-2 text-[10px]">
            {passCount > 0 && <span className="text-emerald-400">{passCount} passed</span>}
            {failCount > 0 && <span className="text-red-400">{failCount} failed</span>}
            {criticalCount > 0 && <span className="text-red-400">{criticalCount} critical</span>}
            {warningCount > 0 && <span className="text-amber-400">{warningCount} warnings</span>}
          </div>
        )}

        {isRunning && currentRoute && (
          <span className="text-[10px] text-violet-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {iteration > 0 ? `Iteration ${iteration} — ` : ''}{currentRoute}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={() => setShowLogs((s) => !s)}
              className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              {showLogs ? 'Hide' : 'Logs'} ({logs.length})
            </button>
          )}
          {(routeResults.length > 0 || fixes.length > 0) && !isRunning && (
            <button onClick={clearResults} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Clear">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">

          {/* Empty state */}
          {!isRunning && routeResults.length === 0 && fixes.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-violet-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Agentic Test Runner</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                  Starts your app, crawls every route with Playwright, runs AI vision analysis, and auto-generates fixes.
                </p>
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-muted-foreground/60 text-left w-full max-w-xs">
                {['Browser automation (Playwright)', 'AI vision screenshot analysis', 'Console error detection', 'Automatic code fix generation'].map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500/60 shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          {showLogs && logs.length > 0 && (
            <div className="rounded-lg border border-border bg-zinc-950 p-2 font-mono text-[10px] text-emerald-400/80 space-y-0.5 max-h-32 overflow-y-auto">
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          {/* Route results */}
          {routeResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Globe className="w-3 h-3" />
                Page Tests
              </div>
              <div className="space-y-1.5">
                {routeResults.map((r) => (
                  <RouteRow
                    key={r.route}
                    result={r}
                    onScreenshot={(src, route) => setScreenshot({ src, route })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* API results */}
          {apiResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Server className="w-3 h-3" />
                API Routes
              </div>
              <div className="space-y-1">
                {apiResults.map((r) => (
                  <div key={r.route} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border text-xs">
                    <span className={cn('font-mono font-bold text-[10px] w-8 text-center', r.ok ? 'text-emerald-400' : 'text-red-400')}>
                      {r.status || 'ERR'}
                    </span>
                    <span className="font-mono text-muted-foreground flex-1 truncate">{r.route}</span>
                    <span className="text-[10px] text-muted-foreground/50">{r.latencyMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Fix suggestions */}
          {fixes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Zap className="w-3 h-3 text-violet-400" />
                AI Fixes ({fixes.length})
              </div>
              <div className="space-y-2">
                {fixes.map((fix, i) => (
                  <FixCard key={fix.filePath} fix={fix} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {screenshot && (
        <ScreenshotPreview
          src={screenshot.src}
          route={screenshot.route}
          onClose={() => setScreenshot(null)}
        />
      )}
    </div>
  )
}
