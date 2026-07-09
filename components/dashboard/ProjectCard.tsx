'use client'

import type { Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowRight, Trash2, Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/store/useToastStore'
import { cn } from '@/lib/utils'

const STATUS_DOT: Record<Project['status'], string> = {
  complete:   'bg-emerald-400',
  generating: 'bg-amber-400 animate-pulse',
  failed:     'bg-red-400',
  idle:       'bg-muted-foreground/40',
}

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const ago = formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('project_files').delete().eq('project_id', project.id)
    await supabase.from('projects').delete().eq('id', project.id)
    onDelete?.(project.id)
    toast.success('Project deleted', project.name)
  }

  return (
    <div
      onClick={() => router.push(`/ide/${project.id}`)}
      className="group relative flex flex-col bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all duration-200 press"
    >
      {/* Top row: icon + status dot + delete */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Wand2 className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[project.status])} />
          <button
            onClick={handleDelete}
            disabled={deleting}
            title={confirmDelete ? 'Click again to confirm deletion' : 'Delete project'}
            className={cn(
              'p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40',
              confirmDelete
                ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                : 'text-muted-foreground hover:text-red-400 hover:bg-muted'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Name */}
      <p className="text-sm font-semibold leading-snug truncate group-hover:text-primary transition-colors mb-1">
        {project.name}
      </p>

      {/* Prompt preview */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1 mb-4">
        {project.prompt}
      </p>

      {/* Bottom row: badge + time + arrow */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          <span className="text-[11px] text-muted-foreground tabular-nums">{ago}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  )
}
