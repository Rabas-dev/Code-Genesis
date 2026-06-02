'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { FileTree } from '@/components/shared/FileTree'
import { PanelLeft } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Project, FileTreeNode } from '@/types'

function buildFileTree(files: { path: string; language: string }[]): FileTreeNode[] {
  const root: FileTreeNode[] = []
  for (const file of files) {
    const parts = file.path.split('/')
    let nodes = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      if (i === parts.length - 1) {
        nodes.push({ name, type: 'file', language: file.language })
      } else {
        let folder = nodes.find((n) => n.name === name && n.type === 'folder')
        if (!folder) {
          folder = { name, type: 'folder', children: [] }
          nodes.push(folder)
        }
        nodes = folder.children!
      }
    }
  }
  return root
}

interface SidebarProps {
  project?: Project | null
}

export function Sidebar({ project }: SidebarProps) {
  const { toggleSidebar, currentProject } = useIDEStore()
  const { generatedFiles } = useGenerationStore()
  const activeProject = project ?? currentProject

  const rawFiles = generatedFiles.length > 0 ? generatedFiles : (activeProject?.files ?? [])
  // Dedupe by path — the chat agent + scaffold can both produce the same path
  // (e.g. next.config.js), which would cause duplicate React keys.
  const sourceFiles = Array.from(
    new Map(rawFiles.map((f) => [f.path.replace(/^\//, ''), f])).values()
  )
  const fileTree = buildFileTree(sourceFiles)

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Explorer
        </span>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Close sidebar"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Project name */}
      {activeProject && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <p className="text-[11px] font-medium text-foreground truncate">{activeProject.name}</p>
        </div>
      )}

      {/* File tree */}
      <ScrollArea className="flex-1 min-h-0">
        {fileTree.length > 0 ? (
          <FileTree nodes={fileTree} />
        ) : (
          <div className="px-3 py-4 text-[11px] text-muted-foreground/50">
            No files generated yet
          </div>
        )}
      </ScrollArea>

      {/* Prompt snippet */}
      {activeProject?.prompt && (
        <div className="shrink-0 border-t border-border px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-1">Prompt</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-mono">
            {activeProject.prompt}
          </p>
        </div>
      )}
    </div>
  )
}
