'use client'

import dynamic from 'next/dynamic'
import { useIDEStore, useIDEStore as useIDEStoreImport } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { injectScaffold } from '@/lib/scaffold/nextjs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  ChevronDown, Play, Square, ExternalLink,
  Loader2, TerminalSquare, FlaskConical, Maximize2, Minimize2,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { TestRunner } from '@/components/testing/TestRunner'
import { toast } from '@/store/useToastStore'

// Load terminal client-only — xterm requires the DOM
const TerminalPanel = dynamic(
  () => import('@/components/shared/TerminalPanel').then((m) => m.TerminalPanel),
  { ssr: false, loading: () => <div className="w-full h-full bg-zinc-950" /> }
)


const TABS = ['logs', 'tests', 'terminal'] as const

type RunState = 'idle' | 'writing' | 'running'

export function BottomPanel() {
  const {
    bottomPanelTab, setBottomPanelTab, toggleBottomPanel,
    currentProject, setPreviewPort, togglePreview, showPreview,
    previewPort, bottomPanelMaximized, toggleBottomPanelMaximized,
  } = useIDEStore()

  const { generatedFiles, logs } = useGenerationStore()

  const [runState, setRunState] = useState<RunState>('idle')
  const [terminalKey, setTerminalKey] = useState(0)
  const [autorun, setAutorun] = useState(false)

  const handleRun = useCallback(async () => {
    if (!currentProject) return

    // Load files from either source — fall back to DB-loaded project files
    const sourceFiles = generatedFiles.length > 0 ? generatedFiles : (currentProject.files ?? [])
    if (!sourceFiles.length) {
      toast.error('Nothing to run', 'Generate the project first')
      return
    }

    // Open panel + switch to terminal tab FIRST so container has real dimensions
    const storeState = useIDEStoreImport.getState()
    if (!storeState.bottomPanelOpen) storeState.toggleBottomPanel()
    setBottomPanelTab('terminal')
    setRunState('writing')

    const loadingId = toast.loading('Starting project…', 'Writing files & launching dev server')

    // Wait for CSS transition (200ms h-0→h-72) to finish before terminal mounts
    await new Promise((r) => setTimeout(r, 300))

    // Write all files (including scaffold) to disk
    const allFiles = injectScaffold(sourceFiles)
    try {
      const res = await fetch('/api/project/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          files: allFiles.map((f) => ({ path: f.path, content: f.content })),
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        console.error('[Run] Write failed:', err)
        toast.update(loadingId, { variant: 'error', title: 'Failed to start', description: 'Could not write project files' })
        setRunState('idle')
        return
      }
    } catch (e) {
      console.error('[Run] Write network error:', e)
      toast.update(loadingId, { variant: 'error', title: 'Failed to start', description: 'Network error writing files' })
      setRunState('idle')
      return
    }

    toast.update(loadingId, { variant: 'success', title: 'Project starting', description: 'Preview will open when the server is ready' })

    // Remount terminal with autorun=true — causes WebSocket reconnect with ?autorun=1
    setAutorun(true)
    setTerminalKey((k) => k + 1)
    setRunState('running')
  }, [currentProject, generatedFiles, setBottomPanelTab])

  const handleStop = useCallback(() => {
    setRunState('idle')
    setAutorun(false)
    setPreviewPort(null)
    if (showPreview) togglePreview()
    setTerminalKey((k) => k + 1)
    toast.info('Project stopped')
  }, [setPreviewPort, showPreview, togglePreview])

  const handlePortDetected = useCallback((p: number) => {
    setPreviewPort(p)
    if (!showPreview) togglePreview()
    toast.success('Preview ready', `Running on localhost:${p}`)
  }, [setPreviewPort, showPreview, togglePreview])

  const canRun = !!currentProject && (generatedFiles.length > 0 || (currentProject.files?.length ?? 0) > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-3 border-b border-border shrink-0 h-8 bg-muted/20">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setBottomPanelTab(tab)}
            className={cn(
              'px-3 py-1 text-xs capitalize font-medium rounded-sm transition-colors flex items-center gap-1',
              bottomPanelTab === tab
                ? 'text-foreground bg-background border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'terminal' && <TerminalSquare className="w-3 h-3" />}
            {tab === 'tests' && <FlaskConical className="w-3 h-3" />}
            {tab}
          </button>
        ))}

        {/* Run / Stop button */}
        <div className="ml-auto flex items-center gap-2">
          {previewPort && runState === 'running' && (
            <button
              onClick={togglePreview}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {showPreview ? 'Hide' : 'Preview'} :{previewPort}
            </button>
          )}

          {runState === 'idle' ? (
            <button
              onClick={handleRun}
              disabled={!canRun}
              className={cn(
                'flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                canRun
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          ) : runState === 'writing' ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              Writing…
            </span>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
        </div>

        <button
          onClick={toggleBottomPanelMaximized}
          className="ml-1 p-1 text-muted-foreground hover:text-foreground transition-colors"
          title={bottomPanelMaximized ? 'Restore panel size' : 'Maximize panel'}
        >
          {bottomPanelMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={toggleBottomPanel}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Hide panel"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {bottomPanelTab === 'logs' && (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="flex items-center gap-2 py-0.5 px-1 text-muted-foreground">
                  <span>Waiting for generation to start...</span>
                </div>
              ) : (
                logs.map((entry, i) => {
                  const isError = entry.includes('ERROR')
                  const isWarn = entry.includes('WARN')
                  return (
                    <div key={i} className="flex items-start gap-2 py-0.5 hover:bg-muted/30 rounded px-1">
                      <span className={cn(
                        'flex-1',
                        isError ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-foreground/80'
                      )}>
                        {entry}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        )}

        {bottomPanelTab === 'tests' && (
          <TestRunner />
        )}

        {bottomPanelTab === 'terminal' && (
          <div className="w-full h-full">
            {currentProject ? (
              <TerminalPanel
                key={terminalKey}
                projectId={currentProject.id}
                autorun={autorun}
                onPortDetected={handlePortDetected}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Open a project to use the terminal.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
