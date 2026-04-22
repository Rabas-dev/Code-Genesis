'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { FileTree } from '@/components/shared/FileTree'
import { fakeFileTree } from '@/lib/fakeData'
import { ChevronsLeft } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Project } from '@/types'

interface SidebarProps {
  project?: Project | null
}

export function Sidebar({ project }: SidebarProps) {
  const { toggleSidebar, currentProject } = useIDEStore()
  const activeProject = project ?? currentProject

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </span>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1 min-h-0 px-1">
        <FileTree nodes={fakeFileTree} />
      </ScrollArea>

      {/* Project info */}
      {activeProject && (
        <div className="shrink-0 border-t border-border p-3 space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Prompt
          </span>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {activeProject.prompt}
          </p>
        </div>
      )}
    </div>
  )
}
