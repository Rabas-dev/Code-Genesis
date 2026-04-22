'use client'

import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { ProjectFile } from '@/types'
import { cn } from '@/lib/utils'

const MonacoEditorLib = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface MonacoEditorProps {
  file: ProjectFile | null
  readOnly?: boolean
  onChange?: (value: string) => void
  height?: string
  highlight?: { line: number; type: 'error' | 'success' }
}

export function MonacoEditor({ file, readOnly = true, onChange, height = '100%', highlight }: MonacoEditorProps) {
  const { resolvedTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleCopy = () => {
    if (file?.content) {
      navigator.clipboard.writeText(file.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
          <span className="text-3xl">📄</span>
        </div>
        <p className="text-sm font-medium">Select a file to view its code</p>
        <p className="text-xs opacity-60">Choose a file from the explorer on the left</p>
      </div>
    )
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {file.path.split('/').map((part, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              <span className={cn(i === arr.length - 1 ? 'text-foreground font-medium' : '')}>
                {part}
              </span>
              {i < arr.length - 1 && <span>/</span>}
            </span>
          ))}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditorLib
          height={height === '100%' ? undefined : height}
          language={file.language}
          value={file.content}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            readOnly,
            fontSize: 13,
            minimap: { enabled: true },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
            fontLigatures: true,
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 8, bottom: 8 },
          }}
          onChange={(val) => onChange?.(val ?? '')}
        />
      </div>
    </div>
  )
}
