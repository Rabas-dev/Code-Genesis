'use client'

import { X } from 'lucide-react'

interface Props {
  src: string       // base64 PNG
  route: string
  onClose: () => void
}

export function ScreenshotPreview({ src, route, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full mx-4 animate-slide-up-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
          <span className="text-xs font-mono text-muted-foreground">{route}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto max-h-[80vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/jpeg;base64,${src}`} alt={`Screenshot of ${route}`} className="w-full" />
        </div>
      </div>
    </div>
  )
}
