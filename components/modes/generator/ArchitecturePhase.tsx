'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { ChevronRight, Layers, FileCode2, GitBranch, Pencil, Download } from 'lucide-react'
import { generateSDD, downloadMarkdown } from '@/lib/documents/generators'
import { toast } from '@/store/useToastStore'

const TYPE_COLORS: Record<string, string> = {
  page: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  component: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  hook: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  util: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  api: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  store: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
}

export function ArchitecturePhase() {
  const { architectureDoc, requirementsDoc, confirmArchitecture, status } = useGenerationStore()
  const { currentProject } = useIDEStore()

  if (!architectureDoc) return null

  const isLoading = status === 'generating'

  const handleDownloadSDD = () => {
    const md = generateSDD(architectureDoc, requirementsDoc)
    downloadMarkdown(`${architectureDoc.projectName.replace(/\s+/g, '-')}-SDD.md`, md)
    toast.success('SDD downloaded', 'Software Design Document')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{architectureDoc.projectName}</h2>
          <p className="text-xs text-muted-foreground">Phase 2 — Architecture Design</p>
        </div>
        <button
          onClick={handleDownloadSDD}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted hover:border-blue-500/30 transition-colors press"
          title="Download Software Design Document"
        >
          <Download className="w-3.5 h-3.5" />
          Download SDD
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Technical Summary</p>
        <p className="text-sm text-foreground/80 leading-relaxed">{architectureDoc.summary}</p>
      </div>

      {/* File tree */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            File Structure ({architectureDoc.fileTree.length} files)
          </p>
        </div>
        <div className="space-y-1.5 font-mono">
          {architectureDoc.fileTree.map((node) => (
            <div key={node.path} className="flex items-start gap-3 group">
              <span className="text-xs text-violet-400 shrink-0 mt-0.5">{node.path}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">— {node.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Components */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Components</p>
        <div className="space-y-2">
          {architectureDoc.components.map((comp) => (
            <div key={comp.name} className="flex items-start gap-3">
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${TYPE_COLORS[comp.type] ?? TYPE_COLORS.component}`}>
                {comp.type}
              </span>
              <div>
                <span className="text-sm font-medium">{comp.name}</span>
                <span className="text-xs text-muted-foreground ml-2">— {comp.purpose}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data flow */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Flow</p>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{architectureDoc.dataFlow}</p>
      </div>

      {/* Tech stack */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tech Stack</p>
        <div className="flex flex-wrap gap-2">
          {architectureDoc.techStack.map((tech) => (
            <span key={tech} className="px-2.5 py-1 text-xs rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={() => currentProject && confirmArchitecture(currentProject.id)}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating wireframe…
          </span>
        ) : (
          <>
            <Pencil className="w-4 h-4" />
            Next: Design UI
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}
