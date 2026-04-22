import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types'
import { Loader2 } from 'lucide-react'

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

const config: Record<ProjectStatus, { label: string; cls: string; spin?: boolean }> = {
  complete: { label: 'Complete', cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' },
  generating: { label: 'Generating', cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/30', spin: true },
  failed: { label: 'Failed', cls: 'bg-red-500/10 text-red-400 border border-red-500/30' },
  idle: { label: 'Idle', cls: 'bg-muted/50 text-muted-foreground border border-border' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, cls, spin } = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cls, className)}>
      {spin && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </span>
  )
}
