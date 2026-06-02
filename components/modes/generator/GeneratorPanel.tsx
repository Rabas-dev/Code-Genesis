'use client'

import { useState, useEffect } from 'react'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { Download, RotateCcw, GitBranch, AlertCircle, ArrowUp, Loader2, FileText } from 'lucide-react'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import { GeneratingOverlay } from './GeneratingOverlay'
import { RequirementsPhase } from './RequirementsPhase'
import { ArchitecturePhase } from './ArchitecturePhase'
import { DesignPhase } from '@/components/modes/design/DesignPhase'
import { GitHubPushModal } from '@/components/shared/GitHubPushModal'
import { downloadProjectZip } from '@/lib/utils/download'
import { generateImplementationDoc, downloadMarkdown } from '@/lib/documents/generators'
import { toast } from '@/store/useToastStore'
import { cn } from '@/lib/utils'

const EXAMPLE_PROMPTS = [
  'Calculator with scientific mode',
  'E-commerce product page',
  'SaaS dashboard with charts',
  'Chat application',
  'Portfolio website',
  'Todo app with filters',
]

export function GeneratorPanel() {
  const [prompt, setPrompt] = useState('')
  const [githubModalOpen, setGithubModalOpen] = useState(false)
  const [isGitHubConnected, setIsGitHubConnected] = useState(false)

  const { startRequirements, status, sdlcStep, generatedFiles, reset, architectureDoc } = useGenerationStore()
  const { selectedFile, currentProject } = useIDEStore()

  // Unify files: generation store (new) or project loaded from DB (existing)
  const allFiles = generatedFiles.length > 0 ? generatedFiles : (currentProject?.files ?? [])
  const isProjectLoaded = allFiles.length > 0

  useEffect(() => {
    fetch('/api/github/status')
      .then((r) => r.json())
      .then((d) => setIsGitHubConnected(d.connected))
      .catch(() => {})

    const params = new URLSearchParams(window.location.search)
    if (params.get('github_connected') === '1') {
      setIsGitHubConnected(true)
      setGithubModalOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleStart = () => {
    if (!prompt.trim()) return
    startRequirements(prompt)
  }

  const handleDownload = () => {
    if (!allFiles.length) return
    downloadProjectZip(allFiles, currentProject?.name ?? 'project')
  }

  const handleDownloadDocs = () => {
    if (!allFiles.length) return
    const name = currentProject?.name ?? architectureDoc?.projectName ?? 'project'
    const md = generateImplementationDoc(allFiles, architectureDoc, name)
    downloadMarkdown(`${name.replace(/\s+/g, '-')}-Implementation.md`, md)
    toast.success('Documentation downloaded', 'Implementation documentation')
  }

  const handleReset = () => {
    reset()
    setPrompt('')
  }

  // Loading phases
  if (status === 'generating' && sdlcStep !== 'requirements' && sdlcStep !== 'architecture') {
    return <div className="flex flex-col h-full relative"><GeneratingOverlay /></div>
  }

  if (sdlcStep === 'requirements') {
    return <div className="flex flex-col h-full"><RequirementsPhase /></div>
  }

  if (sdlcStep === 'architecture') {
    return <div className="flex flex-col h-full"><ArchitecturePhase /></div>
  }

  if (sdlcStep === 'design') {
    return <div className="flex flex-col h-full"><DesignPhase /></div>
  }

  // Complete: project files exist (from generation or loaded from DB)
  if (sdlcStep === 'complete' || status === 'complete' || isProjectLoaded) {
    return (
      <div className="flex flex-col h-full">
        {/* Slim action bar */}
        <div className="shrink-0 px-3 h-9 border-b border-border bg-background flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {allFiles.length} files
          </span>
          {currentProject?.name && (
            <span className="text-xs text-muted-foreground/60">— {currentProject.name}</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={handleDownloadDocs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Download implementation documentation"
            >
              <FileText className="w-3 h-3" />
              Docs
            </button>
            <button
              onClick={() => setGithubModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <GitBranch className="w-3 h-3" />
              Push
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-3 h-3" />
              Export
            </button>
            <div className="w-px h-3.5 bg-border mx-0.5" />
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              New
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <MonacoEditor file={selectedFile} />
        </div>

        <GitHubPushModal
          open={githubModalOpen}
          onClose={() => setGithubModalOpen(false)}
          projectId={currentProject?.id ?? ''}
          projectName={currentProject?.name ?? 'my-project'}
          files={allFiles}
          isGitHubConnected={isGitHubConnected}
        />
      </div>
    )
  }

  // Failed state
  if (status === 'failed') {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-8">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold text-sm">Generation failed</p>
          <p className="text-xs text-muted-foreground">Check your API key or try a different prompt</p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // Initial prompt — premium entry point
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-xl space-y-5 animate-slide-up-fade">

          {/* Icon + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center animate-float">
              <ArrowUp className="w-4 h-4 text-violet-400 -rotate-45" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">What are you building?</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Describe your project — requirements, architecture, wireframe, and code in one pipeline.
              </p>
            </div>
          </div>

          {/* Pipeline breadcrumb */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/40">
            {['Requirements', 'Architecture', 'Wireframe', 'Code'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-1">
                <span className="hover:text-muted-foreground/70 transition-colors cursor-default">{step}</span>
                {i < arr.length - 1 && <span className="text-muted-foreground/20">›</span>}
              </span>
            ))}
          </div>

          {/* Prompt input — glassmorphism card */}
          <div className={cn(
            'relative rounded-2xl border transition-all duration-200',
            prompt.trim()
              ? 'border-violet-500/40 shadow-lg shadow-violet-500/10 bg-card'
              : 'border-border bg-card hover:border-border/80'
          )}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleStart()}
              placeholder="Build a SaaS analytics dashboard with Stripe billing and real-time charts..."
              rows={4}
              className="w-full bg-transparent px-4 pt-4 pb-14 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/30 leading-relaxed font-mono"
            />
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/25 font-mono">⌘↵ to generate</span>
              <button
                onClick={handleStart}
                disabled={!prompt.trim() || status === 'generating'}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 press',
                  prompt.trim() && status !== 'generating'
                    ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30'
                    : 'bg-muted/60 text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                {status === 'generating' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" />
                )}
                {status === 'generating' ? 'Starting…' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="px-2.5 py-1 text-[11px] rounded-lg border border-border/60 text-muted-foreground/60 hover:text-foreground hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-150 press"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
