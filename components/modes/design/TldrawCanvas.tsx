'use client'

import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'

export default function TldrawCanvas() {
  const { resolvedTheme } = useTheme()

  // Inject tldraw dark-mode class based on app theme
  useEffect(() => {
    const el = document.querySelector('.tl-container')
    if (!el) return
    if (resolvedTheme === 'dark') {
      el.setAttribute('data-color-scheme', 'dark')
    } else {
      el.removeAttribute('data-color-scheme')
    }
  }, [resolvedTheme])

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey="code-genesis-design" />
    </div>
  )
}
