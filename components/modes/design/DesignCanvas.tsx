'use client'

import dynamic from 'next/dynamic'

// Tldraw must be loaded client-only — it uses browser APIs
const TldrawCanvas = dynamic(() => import('./TldrawCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full flex items-center justify-center bg-muted/10">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        <span className="text-sm">Loading design canvas…</span>
      </div>
    </div>
  ),
})

export function DesignCanvas() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">Design Canvas</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">
            Wireframe Mode
          </span>
        </div>
        <p className="text-xs text-muted-foreground ml-auto hidden md:block">
          Sketch your UI layout before generating code
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        <TldrawCanvas />
      </div>
    </div>
  )
}
