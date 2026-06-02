'use client'

import { Tldraw, createShapeId, type Editor } from '@tldraw/tldraw'
import { toRichText } from '@tldraw/tlschema'
import '@tldraw/tldraw/tldraw.css'
import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'
import type { WireframeComponent } from '@/lib/ai/stages/wireframe'

const TYPE_COLORS: Record<string, string> = {
  navbar: 'violet',
  sidebar: 'blue',
  card: 'green',
  table: 'yellow',
  form: 'orange',
  button: 'red',
  header: 'violet',
  list: 'blue',
  chart: 'green',
  modal: 'grey',
}

interface Props {
  components: WireframeComponent[]
  onEditorReady: (editor: Editor) => void
}

export default function WireframeTldraw({ components, onEditorReady }: Props) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<Editor | null>(null)

  // Sync dark mode
  useEffect(() => {
    const el = document.querySelector('.tl-container')
    if (!el) return
    if (resolvedTheme === 'dark') {
      el.setAttribute('data-color-scheme', 'dark')
    } else {
      el.removeAttribute('data-color-scheme')
    }
  }, [resolvedTheme])

  const handleMount = (editor: Editor) => {
    editorRef.current = editor
    onEditorReady(editor)

    if (!components.length) return

    // Create shapes from AI wireframe components
    const shapes = components.map((comp) => ({
      id: createShapeId(comp.id),
      type: 'geo' as const,
      x: comp.x,
      y: comp.y,
      props: {
        geo: 'rectangle' as const,
        w: comp.w,
        h: comp.h,
        richText: toRichText(comp.label),
        fill: 'semi' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (TYPE_COLORS[comp.type] ?? 'grey') as any,
        size: 's' as const,
        font: 'sans' as const,
        align: 'middle' as const,
        verticalAlign: 'middle' as const,
        dash: 'draw' as const,
        url: '',
        growY: 0,
        scale: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labelColor: 'black' as any,
      },
    }))

    editor.createShapes(shapes)

    // Zoom to fit all shapes
    editor.zoomToFit({ animation: { duration: 300 } })
  }

  return (
    <div className="absolute inset-0">
      <Tldraw onMount={handleMount} />
    </div>
  )
}
