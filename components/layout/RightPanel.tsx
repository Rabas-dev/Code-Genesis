'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProjectPlanCard } from '@/components/modes/generator/ProjectPlanCard'
import { ScoreCard } from '@/components/modes/judge/ScoreCard'
import { SeniorReviewBadge } from '@/components/modes/judge/SeniorReviewBadge'
import { RootCauseCard } from '@/components/modes/debugger/RootCauseCard'
import { fakeCodeAnalysis } from '@/lib/fakeData'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODE_LABEL: Record<string, string> = {
  generator: 'Project Plan',
  judge: 'Code Analysis',
  architect: 'Architecture',
  debugger: 'Diagnosis',
}

export function RightPanel() {
  const { activeMode, toggleRightPanel, currentProject } = useIDEStore()
  const { status, progress, currentStep } = useGenerationStore()

  const isGenerating = status === 'generating'

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isGenerating ? 'Generating…' : MODE_LABEL[activeMode] ?? 'AI Output'}
        </span>
        <button
          onClick={toggleRightPanel}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {/* Generating overlay in right panel */}
        {isGenerating ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium">AI is building your project</p>
                <p className="text-xs text-muted-foreground">This takes about 6 seconds</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate pr-2">{currentStep}</span>
                <span className="shrink-0">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
            <div className="space-y-2 pt-2">
              {['Parsing prompt', 'Designing architecture', 'Writing files', 'Running tests'].map(
                (s, i) => (
                  <div key={s} className={cn('flex items-center gap-2 text-xs', progress > i * 25 ? 'text-foreground' : 'text-muted-foreground')}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', progress > i * 25 ? 'bg-violet-400' : 'bg-border')} />
                    {s}
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {activeMode === 'generator' && <ProjectPlanCard />}
            {activeMode === 'judge' && (
              <>
                <ScoreCard analysis={fakeCodeAnalysis} />
                <SeniorReviewBadge verdict={fakeCodeAnalysis.seniorVerdict} />
              </>
            )}
            {activeMode === 'architect' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">MICROSERVICES</p>
                  <div className="space-y-1.5">
                    {['Auth Service', 'Ride Service', 'Driver Service', 'Payment Service', 'Notification Service'].map((s) => (
                      <div key={s} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeMode === 'debugger' && <RootCauseCard />}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
