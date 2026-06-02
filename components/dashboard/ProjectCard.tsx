'use client'

import type { Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Clock, ArrowRight, FileCode2, MoreHorizontal, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/store/useToastStore'

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const ago = formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
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
      className="group relative block rounded-xl border border-border bg-card hover:border-violet-500/20 hover:shadow-md hover:shadow-violet-500/5 transition-all duration-200 p-4 cursor-pointer overflow-hidden press"
    >
      {/* Shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none animate-shimmer" />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-sm leading-tight truncate group-hover:text-violet-400 transition-colors">
            {project.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={project.status} />
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-border bg-popover shadow-lg py-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? 'Deleting...' : 'Delete project'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed pl-9 mb-3">
        {project.prompt}
      </p>

      <div className="flex items-center justify-between pl-9">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
          <Clock className="w-3 h-3" />
          {ago}
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Open
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}
