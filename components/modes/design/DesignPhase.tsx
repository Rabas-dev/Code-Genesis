'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback } from 'react'
import type { Editor } from '@tldraw/tldraw'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { ChevronRight, Pencil, Info } from 'lucide-react'

const WireframeTldraw = dynamic(() => import('./WireframeTldraw'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full flex items-center justify-center bg-muted/10">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        <span className="text-sm">Loading canvas…</span>
      </div>
    </div>
  ),
})

export function DesignPhase() {
  const editorRef = useRef<Editor | null>(null)
  const { wireframeDoc, confirmDesign, status } = useGenerationStore()
  const { currentProject } = useIDEStore()

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const handleProceed = () => {
    if (!currentProject || !editorRef.current) return

    // Extract layout description from current canvas state
    const shapes = editorRef.current.getCurrentPageShapes()
    const layoutLines = shapes
      .filter((s) => s.type === 'geo')
      .map((s) => {
        const props = s.props as { richText?: { content?: Array<{ content?: Array<{ text?: string }> }> }; text?: string; w?: number; h?: number }
        // TLDraw v5 uses richText; fall back to text for backwards compat
        const label = props.richText?.content?.[0]?.content?.[0]?.text ?? props.text ?? 'Component'
        const w = Math.round(props.w ?? 0)
        const h = Math.round(props.h ?? 0)
        const x = Math.round(s.x)
        const y = Math.round(s.y)
        return `- ${label} at (${x},${y}), size ${w}×${h}`
      })

    const layoutDescription = layoutLines.length
      ? `UI Layout (from wireframe):\n${layoutLines.join('\n')}`
      : ''

    confirmDesign(layoutDescription, currentProject.id)
  }

  if (!wireframeDoc) return null

  const isLoading = status === 'generating'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <span className="text-xs font-semibold text-primary">Design Canvas</span>
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-violet-500/15 text-primary border border-primary/20">
              Phase 3 — Wireframe
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Drag &amp; resize components, then proceed
          </div>
          <button
            onClick={handleProceed}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-semibold transition-opacity shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating code…
              </>
            ) : (
              <>
                Proceed to Implementation
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Component legend */}
      <div className="shrink-0 px-4 py-1.5 border-b border-border bg-muted/10 flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] text-muted-foreground shrink-0">Legend:</span>
        {[
          { label: 'Navbar', color: 'bg-violet-500/30 border-primary/40 text-violet-300' },
          { label: 'Sidebar', color: 'bg-blue-500/30 border-blue-500/40 text-blue-300' },
          { label: 'Card', color: 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300' },
          { label: 'Table', color: 'bg-yellow-500/30 border-yellow-500/40 text-yellow-300' },
          { label: 'Form', color: 'bg-orange-500/30 border-orange-500/40 text-orange-300' },
          { label: 'Chart', color: 'bg-green-500/30 border-green-500/40 text-green-300' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${color}`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        <WireframeTldraw
          components={wireframeDoc.components}
          onEditorReady={handleEditorReady}
        />
      </div>
    </div>
  )
}
