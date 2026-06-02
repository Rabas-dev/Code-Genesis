'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { Check, FileCode2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ProjectPlanCard() {
  const { generatedFiles, architectureDoc, requirementsDoc } = useGenerationStore()
  const { currentProject } = useIDEStore()

  if (!currentProject) return null

  const allFiles = generatedFiles.length > 0 ? generatedFiles : (currentProject.files ?? [])

  // Features: prefer architectureDoc components, fallback to requirementsDoc
  const features: string[] =
    architectureDoc?.components?.map((c) => c.purpose ?? c.name).filter(Boolean) ??
    requirementsDoc?.coreFeatures ??
    []

  // Tech stack: prefer architectureDoc, fallback to requirementsDoc
  const stack: string[] =
    architectureDoc?.techStack ??
    requirementsDoc?.techStack ??
    []

  return (
    <div className="space-y-3">
      {/* Prompt */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt</p>
        <p className="text-xs text-foreground/80 leading-relaxed">{currentProject.prompt}</p>
      </div>

      {/* Tech stack */}
      {stack.length > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {stack.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] font-medium">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</p>
          <div className="space-y-1.5">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded flex items-center justify-center bg-emerald-500/20 mt-0.5 shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                </div>
                <span className="text-foreground/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files count */}
      {allFiles.length > 0 && (
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <FileCode2 className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">{allFiles.length} Files Generated</p>
            <p className="text-xs text-muted-foreground">
              {stack.length > 0 ? stack.slice(0, 2).join(' + ') : 'TypeScript + React'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
