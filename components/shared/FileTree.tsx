'use client'

import { useState } from 'react'
import type { FileTreeNode } from '@/types'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode2, FileJson, FileText, FileType, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
    case 'js':
    case 'jsx':
      return <FileCode2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
    case 'json':
      return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    case 'css':
      return <FileType className="w-3.5 h-3.5 text-pink-400 shrink-0" />
    case 'md':
      return <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
    default:
      return <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
  }
}

interface FileNodeProps {
  node: FileTreeNode
  depth: number
  path: string
}

function FileNode({ node, depth, path }: FileNodeProps) {
  const [open, setOpen] = useState(depth < 1)
  const { selectedFile, setSelectedFile, currentProject } = useIDEStore()
  const { generatedFiles } = useGenerationStore()

  const filePath = path ? `${path}/${node.name}` : node.name
  const allFiles = [...(currentProject?.files ?? []), ...generatedFiles]
  const projectFile = allFiles.find((f) => f.path === filePath || f.path.endsWith(node.name))

  const isSelected = selectedFile?.id === projectFile?.id

  if (node.type === 'folder') {
    return (
      <div>
        <button
          className="flex items-center gap-1 w-full px-2 py-0.5 hover:bg-muted/50 rounded text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )}
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <FileNode key={child.name} node={child} depth={depth + 1} path={filePath} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className={cn(
        'flex items-center gap-1.5 w-full py-0.5 text-sm rounded transition-colors',
        isSelected
          ? 'bg-violet-500/20 text-violet-300'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      onClick={() => {
        if (projectFile) setSelectedFile(projectFile)
      }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  )
}

interface FileTreeProps {
  nodes: FileTreeNode[]
}

export function FileTree({ nodes }: FileTreeProps) {
  return (
    <div className="py-1">
      {nodes.map((node) => (
        <FileNode key={node.name} node={node} depth={0} path="" />
      ))}
    </div>
  )
}
