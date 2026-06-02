'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PanelResizeHandleProps {
  /** Current panel height in px */
  height: number
  /** Called continuously while dragging with the new height */
  onResize: (height: number) => void
  /** Max height the panel may grow to (px) */
  maxHeight: number
  /** Min height the panel may shrink to (px) */
  minHeight: number
  /** Double-click resets to this height */
  defaultHeight: number
}

// VS Code-style drag handle that sits on the TOP edge of the bottom panel.
// Dragging up grows the panel; dragging down shrinks it.
export function PanelResizeHandle({ height, onResize, maxHeight, minHeight, defaultHeight }: PanelResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    startY.current = e.clientY
    startH.current = height
  }, [height])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => {
      // Dragging up (smaller clientY) → taller panel
      const delta = startY.current - e.clientY
      const next = Math.min(maxHeight, Math.max(minHeight, startH.current + delta))
      onResize(next)
    }
    const onUp = () => setDragging(false)

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, maxHeight, minHeight, onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={() => onResize(defaultHeight)}
      title="Drag to resize · double-click to reset"
      className={cn(
        'group absolute -top-1 left-0 right-0 h-2 z-20 cursor-row-resize flex items-center justify-center',
      )}
    >
      {/* Visible hairline that thickens/colors on hover or while dragging */}
      <div
        className={cn(
          'h-0.5 w-full transition-colors duration-100',
          dragging ? 'bg-violet-500' : 'bg-transparent group-hover:bg-violet-500/50'
        )}
      />
    </div>
  )
}
