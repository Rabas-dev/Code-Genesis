'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { RightPanel } from './RightPanel'
import { BottomPanel } from './BottomPanel'
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal'
import { SDLCProgressBar } from '@/components/shared/SDLCProgressBar'
import { GeneratorPanel } from '@/components/modes/generator/GeneratorPanel'
import { QualityPanel } from '@/components/modes/quality/QualityPanel'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import type { Project } from '@/types'
import { cn } from '@/lib/utils'
import { RefreshCw, X, Loader2, ExternalLink, TerminalSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/store/useToastStore'
import { PanelResizeHandle } from './PanelResizeHandle'
import { BOTTOM_PANEL_MIN, BOTTOM_PANEL_DEFAULT } from '@/store/useIDEStore'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface AppShellProps {
  project?: Project | null
}

function MainPanel() {
  const { activeMode, selectedFile } = useIDEStore()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEditorChange = useCallback((value: string) => {
    if (!selectedFile?.id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('project_files')
        .update({ content: value })
        .eq('id', selectedFile.id)
      // Also hot-patch the running project on disk if a preview is live
      const proj = useIDEStore.getState().currentProject
      if (proj?.id && !error) {
        fetch('/api/project/patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: proj.id, changes: [{ path: selectedFile.path, content: value }] }),
        }).catch(() => {})
      }
      if (error) toast.error('Save failed', 'Could not save your changes')
      else {
        toast.success('Saved', selectedFile.path)
        useGenerationStore.getState().bumpCodeVersion() // triggers Quality auto-rescore
      }
    }, 1500)
  }, [selectedFile?.id, selectedFile?.path])

  switch (activeMode) {
    case 'generator':
      return <GeneratorPanel />
    case 'quality':
      return <QualityPanel />
    default:
      return <MonacoEditor file={selectedFile} readOnly={false} onChange={handleEditorChange} />
  }
}

function PreviewPanel({ port }: { port: number }) {
  const { togglePreview } = useIDEStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting')
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll until the dev server responds, then load the iframe
  useEffect(() => {
    let attempts = 0
    const MAX = 30  // 30 × 2s = 60s max

    const tryLoad = async () => {
      attempts++
      try {
        const res = await fetch(`http://localhost:${port}`, { mode: 'no-cors', signal: AbortSignal.timeout(2000) })
        // no-cors always gives opaque response — if we didn't throw, server is up
        setStatus('ready')
        if (retryRef.current) clearInterval(retryRef.current)
      } catch {
        if (attempts >= MAX) {
          setStatus('error')
          if (retryRef.current) clearInterval(retryRef.current)
        }
      }
    }

    tryLoad()
    retryRef.current = setInterval(tryLoad, 2000)
    return () => { if (retryRef.current) clearInterval(retryRef.current) }
  }, [port])

  const refresh = () => {
    setStatus('connecting')
    if (iframeRef.current) {
      iframeRef.current.src = `http://localhost:${port}`
    }
  }

  const openInTab = () => window.open(`http://localhost:${port}`, '_blank')

  return (
    <div className="flex flex-col h-full border-l border-border">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 h-8 bg-muted/20 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'w-2 h-2 rounded-full inline-block',
            status === 'ready' ? 'bg-emerald-400 animate-pulse' : status === 'error' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
          )} />
          <span className="text-[10px] font-mono text-emerald-400">localhost:{port}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/50 ml-1">
          {status === 'connecting' ? 'Compiling…' : status === 'error' ? 'Server stopped' : 'Live Preview'}
        </span>
        <button onClick={openInTab} className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Open in new tab">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button onClick={refresh} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
          <RefreshCw className={cn('w-3.5 h-3.5', status === 'connecting' && 'animate-spin')} />
        </button>
        <button onClick={togglePreview} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Close preview">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 relative bg-white">
        {status === 'connecting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 z-10">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span className="text-xs text-muted-foreground">Compiling your app…</span>
            <span className="text-[10px] text-muted-foreground/50">This takes ~5 seconds on first load</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 z-10">
            <X className="w-6 h-6 text-red-400" />
            <span className="text-xs text-muted-foreground">Server stopped — check the terminal for errors</span>
            <button onClick={() => { setStatus('connecting'); window.dispatchEvent(new CustomEvent('preview-retry')) }} className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors">
              Retry
            </button>
          </div>
        )}
        {status === 'ready' && (
          <iframe
            ref={iframeRef}
            src={`http://localhost:${port}`}
            className="w-full h-full border-0"
            title="Live Preview"
            allow="*"
          />
        )}
      </div>
    </div>
  )
}

// Always-visible bottom status bar — the way to bring the panel back after hiding it
function StatusBar() {
  const {
    bottomPanelOpen, toggleBottomPanel, setBottomPanelTab,
    previewPort, showPreview, togglePreview,
  } = useIDEStore()

  const openTab = (tab: 'logs' | 'tests' | 'terminal') => {
    if (!bottomPanelOpen) toggleBottomPanel()
    setBottomPanelTab(tab)
  }

  return (
    <div className="shrink-0 h-6 border-t border-border bg-muted/30 flex items-center px-2 gap-1 text-[10px] text-muted-foreground select-none">
      <button
        onClick={() => openTab('terminal')}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
        title="Terminal"
      >
        <TerminalSquare className="w-3 h-3" />
        Terminal
      </button>
      <button
        onClick={() => openTab('logs')}
        className="px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
      >
        Logs
      </button>
      <button
        onClick={() => openTab('tests')}
        className="px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
      >
        Tests
      </button>

      {previewPort && (
        <button
          onClick={togglePreview}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
          title="Toggle preview"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          :{previewPort}
        </button>
      )}

      <button
        onClick={toggleBottomPanel}
        className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-foreground transition-colors"
        title={bottomPanelOpen ? 'Hide panel' : 'Show panel'}
      >
        {bottomPanelOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        {bottomPanelOpen ? 'Hide panel' : 'Show panel'}
      </button>
    </div>
  )
}

export function AppShell({ project }: AppShellProps) {
  const {
    sidebarOpen, rightPanelOpen, bottomPanelOpen, showPreview, previewPort,
    chatOpen, toggleChat, bottomPanelHeight, bottomPanelMaximized, setBottomPanelHeight,
  } = useIDEStore()
  const { status } = useGenerationStore()

  const showingPreview = showPreview && !!previewPort

  // Cap the panel at ~70% of the viewport so the editor never fully disappears
  const [maxPanelHeight, setMaxPanelHeight] = useState(600)
  useEffect(() => {
    const update = () => setMaxPanelHeight(Math.round(window.innerHeight * 0.75))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const panelHeight = !bottomPanelOpen
    ? 0
    : bottomPanelMaximized
      ? maxPanelHeight
      : Math.min(bottomPanelHeight, maxPanelHeight)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <LLMSettingsModal />
      <Navbar project={project} />

      {(status === 'generating' || status === 'complete') && <SDLCProgressBar />}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            'shrink-0 border-r border-border overflow-hidden transition-all duration-200 ease-in-out',
            sidebarOpen ? 'w-60' : 'w-0'
          )}
        >
          <Sidebar project={project} />
        </div>

        {/* Center: editor + preview split */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Mode content */}
            <div className={cn('flex flex-col min-h-0 overflow-hidden transition-all duration-200', showingPreview ? 'w-2/5' : 'flex-1')}>
              <MainPanel />
            </div>

            {/* Live preview — 60% width when open */}
            {showingPreview && previewPort && (
              <div className="w-3/5 flex flex-col min-h-0 overflow-hidden">
                <PreviewPanel port={previewPort} />
              </div>
            )}
          </div>

          {/* Bottom panel — resizable like VS Code */}
          <div
            className="shrink-0 border-t border-border overflow-hidden relative"
            style={{
              height: panelHeight,
              // Animate open/close + maximize, but NOT during a live drag (no transition then)
              transition: 'height 200ms ease-in-out',
            }}
          >
            {bottomPanelOpen && (
              <PanelResizeHandle
                height={bottomPanelHeight}
                onResize={setBottomPanelHeight}
                minHeight={BOTTOM_PANEL_MIN}
                maxHeight={maxPanelHeight}
                defaultHeight={BOTTOM_PANEL_DEFAULT}
              />
            )}
            <BottomPanel />
          </div>

          {/* Status bar — always visible; reopens the panel when it's hidden */}
          <StatusBar />
        </div>

        {/* Right panel */}
        <div
          className={cn(
            'shrink-0 border-l border-border overflow-hidden transition-all duration-200 ease-in-out',
            rightPanelOpen ? 'w-80' : 'w-0'
          )}
        >
          <RightPanel />
        </div>

        {/* Chat panel — slides in from far right */}
        <div
          className={cn(
            'shrink-0 border-l border-border overflow-hidden transition-all duration-200 ease-in-out',
            chatOpen ? 'w-80' : 'w-0'
          )}
        >
          {chatOpen && <ChatPanel onClose={toggleChat} />}
        </div>
      </div>
    </div>
  )
}
