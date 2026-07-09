'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { X, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProjectPlanCard } from '@/components/modes/generator/ProjectPlanCard'
import { AutoFixFeed } from '@/components/autofix/AutoFixFeed'
import { cn } from '@/lib/utils'

const MODE_LABEL: Record<string, string> = {
  generator: 'Project Plan',
  quality: 'Code Quality',
}

export function RightPanel() {
  const { activeMode, toggleRightPanel } = useIDEStore()
  const { status, progress, currentStep } = useGenerationStore()

  const isGenerating = status === 'generating'

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {isGenerating ? 'Generating' : (MODE_LABEL[activeMode] ?? 'Output')}
        </span>
        <button
          onClick={toggleRightPanel}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {isGenerating ? (
          <div className="p-4 space-y-5">
            {/* Spinner + label */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              </div>
              <div>
                <p className="text-xs font-medium">Building your project</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{currentStep || 'Initializing…'}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1.5">
              {['Parsing prompt', 'Designing architecture', 'Writing files', 'Finalizing'].map((s, i) => (
                <div key={s} className={cn('flex items-center gap-2 text-[11px]', progress > i * 25 ? 'text-foreground' : 'text-muted-foreground/40')}>
                  <div className={cn('w-1 h-1 rounded-full shrink-0', progress > i * 25 ? 'bg-violet-400' : 'bg-muted-foreground/20')} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <AutoFixFeed />
            {activeMode === 'generator' && <ProjectPlanCard />}
            {activeMode === 'quality' && (
              <div className="rounded-lg border border-border p-4 text-center space-y-1.5">
                <p className="text-xs font-medium">{MODE_LABEL[activeMode]}</p>
                <p className="text-[11px] text-muted-foreground">Results appear in the main panel.</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
