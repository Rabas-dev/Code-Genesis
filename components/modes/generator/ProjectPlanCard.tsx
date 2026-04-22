'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { fakeProjects } from '@/lib/fakeData'
import { Check, FileCode2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const FEATURES = [
  'User authentication & session management',
  'Responsive dashboard layout',
  'Real-time analytics charts',
  'Stripe billing integration',
  'Role-based access control',
]

const STACK = ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Prisma', 'Supabase']

export function ProjectPlanCard() {
  const { generatedFiles, status } = useGenerationStore()
  const { currentProject } = useIDEStore()
  const project = currentProject ?? fakeProjects[0]

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt</p>
        <p className="text-xs text-foreground/80 leading-relaxed">{project.prompt}</p>
      </div>

      {/* Tech stack */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tech Stack</p>
        <div className="flex flex-wrap gap-1.5">
          {STACK.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] font-medium">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</p>
        <div className="space-y-1.5">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-2 text-xs">
              <div className="w-4 h-4 rounded flex items-center justify-center bg-emerald-500/20 mt-0.5 shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <span className="text-foreground/80">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Files count */}
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <FileCode2 className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {status === 'complete' ? (generatedFiles.length || project.files.length) : 8} Files Generated
          </p>
          <p className="text-xs text-muted-foreground">TypeScript + React</p>
        </div>
      </div>
    </div>
  )
}
