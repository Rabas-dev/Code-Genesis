import type { Project } from '@/types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const ago = formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })

  return (
    <Link
      href={`/ide/${project.id}`}
      className="group block rounded-2xl border border-border bg-card hover:border-violet-500/40 hover:bg-violet-500/5 transition-all duration-200 p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-tight group-hover:text-violet-400 transition-colors">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {project.prompt}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {ago}
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Open
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  )
}
