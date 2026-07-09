'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface TerminalPanelProps {
  projectId: string
  autorun?: boolean
  onPortDetected?: (port: number) => void
  onReady?: () => void
  /** Fired (debounced) when a Next.js build/runtime error is detected in output */
  onBuildError?: (errorText: string) => void
  /** Fired when the dev server reports a successful compile */
  onCompiled?: () => void
}

// Strip ANSI escape codes so captured error text is clean for the LLM.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g
function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '')
}

const ERROR_MARKERS = [
  'Failed to compile',
  'Module not found',
  'Unhandled Runtime Error',
  'Type error:',
  'SyntaxError',
  'ReferenceError',
  'Error: Cannot find module',
]
const SUCCESS_MARKERS = ['✓ Compiled', 'Compiled successfully', 'compiled successfully']

// Write text to the clipboard with a fallback for non-secure / unfocused contexts.
function writeClipboard(text: string): Promise<void> {
  if (!text) return Promise.resolve()
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
  }
  fallbackCopy(text)
  return Promise.resolve()
}
function fallbackCopy(text: string) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch { /* ignore */ }
}

export function TerminalPanel({ projectId, autorun = false, onPortDetected, onReady, onBuildError, onCompiled }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<import('xterm').Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<import('xterm-addon-fit').FitAddon | null>(null)
  const portDetectedRef = useRef(false)
  const roRef = useRef<ResizeObserver | null>(null)
  const disposedRef = useRef(false)
  // Guards fit() until xterm's renderService is fully up (double-rAF after open()).
  // Calling fit() before this is set causes Viewport._innerRefresh to crash because
  // _renderService.dimensions is undefined.
  const initializedRef = useRef(false)
  const [copied, setCopied] = useState(false)
  // Rolling buffer + error-capture state for the auto-fix agent
  const outBufRef = useRef('')
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastErrorSentRef = useRef('')

  // Copy the current selection, or the entire scrollback buffer if nothing is selected.
  const handleCopy = useCallback(async () => {
    const term = termRef.current
    if (!term) return
    let text = term.getSelection()
    if (!text || !text.trim()) {
      // No selection → copy the whole visible + scrollback buffer
      const buf = term.buffer.active
      const lines: string[] = []
      for (let i = 0; i < buf.length; i++) {
        const line = buf.getLine(i)
        if (line) lines.push(line.translateToString(true))
      }
      text = lines.join('\n').replace(/\n+$/, '') + '\n'
    }
    await writeClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  // Only fit when xterm is fully initialized AND container has real pixel dimensions.
  const safeFit = useCallback(() => {
    if (disposedRef.current || !initializedRef.current) return
    const container = containerRef.current
    if (!container || container.clientWidth < 10 || container.clientHeight < 10) return
    try {
      fitAddonRef.current?.fit()
    } catch { /* swallow dimension errors during teardown */ }
  }, [])

  // Poll via rAF until the container has real dimensions (max 2 seconds)
  const waitForContainerSize = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const deadline = Date.now() + 2000
      const check = () => {
        if (disposedRef.current) { resolve(); return }
        const el = containerRef.current
        if ((el && el.clientWidth > 0 && el.clientHeight > 0) || Date.now() > deadline) {
          resolve()
        } else {
          requestAnimationFrame(check)
        }
      }
      requestAnimationFrame(check)
    })
  }, [])

  const connect = useCallback(async () => {
    if (!containerRef.current) return
    // Guard against double-connect (StrictMode, fast re-renders): if a terminal
    // or socket already exists for this mount, don't spin up a second one.
    if (termRef.current || wsRef.current) return
    disposedRef.current = false

    // Dynamic imports — SSR-safe
    const { Terminal } = await import('xterm')
    const { FitAddon } = await import('xterm-addon-fit')
    await import('xterm/css/xterm.css')

    if (disposedRef.current || !containerRef.current) return
    // Re-check after the async imports — another invocation may have won the race
    if (termRef.current || wsRef.current) return

    // Clean up any leftover observer (refs above are guaranteed null here)
    roRef.current?.disconnect(); roRef.current = null
    fitAddonRef.current = null

    // ── Critical: wait until the container has real pixel dimensions ──────────
    // The bottom panel uses a CSS transition from h-0 → h-72.
    // If we call term.open() while height is still 0, xterm's internal
    // renderService.dimensions is undefined → Viewport._innerRefresh crashes.
    await waitForContainerSize()
    if (disposedRef.current || !containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
        cursor: '#a78bfa',
        selectionBackground: '#a78bfa33',
        black: '#18181b', brightBlack: '#3f3f46',
        red: '#f87171', brightRed: '#fca5a5',
        green: '#4ade80', brightGreen: '#86efac',
        yellow: '#facc15', brightYellow: '#fde047',
        blue: '#60a5fa', brightBlue: '#93c5fd',
        magenta: '#c084fc', brightMagenta: '#d8b4fe',
        cyan: '#22d3ee', brightCyan: '#67e8f9',
        white: '#d4d4d8', brightWhite: '#f4f4f5',
      },
      allowTransparency: false,
      scrollback: 1000,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    // open() is now safe — container has real dimensions
    term.open(containerRef.current)
    termRef.current = term
    fitAddonRef.current = fitAddon

    // Double-rAF: the first frame lets xterm's open() finish building its
    // renderService; the second frame is when dimensions are guaranteed non-null.
    // Only after both frames do we mark initializedRef=true and call fit/focus.
    requestAnimationFrame(() => {
      if (disposedRef.current) return
      requestAnimationFrame(() => {
        if (disposedRef.current) return
        initializedRef.current = true
        safeFit()
        term.focus()
      })
    })

    // WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/terminal?projectId=${encodeURIComponent(projectId)}${autorun ? '&autorun=1' : ''}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (disposedRef.current) return
      onReady?.()
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }

    ws.onmessage = (event) => {
      if (disposedRef.current) return
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'output') {
          term.write(msg.data)

          // ── Build-error / compile-success detection for the auto-fix agent ──
          if (onBuildError || onCompiled) {
            outBufRef.current = (outBufRef.current + stripAnsi(msg.data)).slice(-8000)
            const buf = outBufRef.current

            if (SUCCESS_MARKERS.some((m) => buf.includes(m))) {
              onCompiled?.()
            }
            if (onBuildError && ERROR_MARKERS.some((m) => buf.includes(m))) {
              // Debounce so the full multi-line error finishes printing first
              if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
              errorTimerRef.current = setTimeout(() => {
                const text = outBufRef.current.trim()
                // Avoid re-reporting the same error repeatedly
                if (text && text !== lastErrorSentRef.current) {
                  lastErrorSentRef.current = text
                  onBuildError(text)
                }
              }, 1200)
            }
          }

          if (!portDetectedRef.current) {
            // First extract the port from the URL line (appears before compilation)
            const urlPatterns = [
              /- Local:\s+https?:\/\/localhost:(\d{4,5})/,
              /(?:Local|local):\s+https?:\/\/localhost:(\d{4,5})/,
              /http:\/\/localhost:(\d{4,5})/,
            ]
            for (const re of urlPatterns) {
              const m = msg.data.match(re)
              if (m) {
                const p = parseInt(m[1], 10)
                if (p !== parseInt(window.location.port || '3000', 10)) {
                  // Store detected port but wait for "Ready" before opening preview
                  portDetectedRef.current = true
                  // Delay preview open by 3s to let compilation finish
                  setTimeout(() => { onPortDetected?.(p) }, 3000)
                }
                break
              }
            }
          }
        } else if (msg.type === 'port') {
          if (!portDetectedRef.current) {
            portDetectedRef.current = true
            onPortDetected?.(msg.port)
          }
        }
      } catch {
        if (!disposedRef.current) term.write(event.data)
      }
    }

    ws.onerror = () => {
      if (!disposedRef.current) {
        term.writeln('\r\n\x1b[31m[Terminal] WebSocket error — make sure the app is running with: npm run dev\x1b[0m')
      }
    }

    ws.onclose = () => {
      if (!disposedRef.current) {
        term.writeln('\r\n\x1b[33m[Terminal] Session closed.\x1b[0m')
      }
    }

    term.onData((data) => {
      if (!disposedRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // Robust clipboard write: try the async Clipboard API, fall back to a
    // hidden textarea + execCommand (works even when the page isn't focused).
    const copyText = (text: string) => {
      if (!text) return
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => execCommandCopy(text))
      } else {
        execCommandCopy(text)
      }
    }
    const execCommandCopy = (text: string) => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { /* give up silently */ }
    }

    // Auto-copy on selection — the instant you finish selecting text in the
    // terminal it lands on your clipboard (like tmux / iTerm "copy on select").
    term.onSelectionChange(() => {
      const sel = term.getSelection()
      if (sel && sel.trim().length > 0) copyText(sel)
    })

    // Cmd/Ctrl+C (copy selection) and Cmd/Ctrl+V (paste)
    term.attachCustomKeyEventHandler((e) => {
      const mod = e.metaKey || e.ctrlKey
      if (e.type !== 'keydown' || !mod) return true

      if (e.key === 'c' || e.key === 'C') {
        const sel = term.getSelection()
        if (sel && sel.length > 0) {
          copyText(sel)
          return false   // don't send SIGINT when copying
        }
        return true       // no selection → let Ctrl+C interrupt the process
      }

      if (e.key === 'v' || e.key === 'V') {
        navigator.clipboard?.readText().then((text) => {
          if (text && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data: text }))
          }
        }).catch(() => {})
        return false
      }

      return true
    })

    // ResizeObserver — debounced via rAF, guarded by dimension check
    let rafId: number | null = null
    const ro = new ResizeObserver(() => {
      if (disposedRef.current) return
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        rafId = null
        safeFit()
        if (!disposedRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
        }
      })
    })
    ro.observe(containerRef.current)
    roRef.current = ro
  }, [projectId, autorun, onPortDetected, onReady, onBuildError, onCompiled, safeFit, waitForContainerSize])

  useEffect(() => {
    portDetectedRef.current = false
    connect()

    return () => {
      disposedRef.current = true
      initializedRef.current = false
      roRef.current?.disconnect(); roRef.current = null
      wsRef.current?.close(); wsRef.current = null
      termRef.current?.dispose(); termRef.current = null
      fitAddonRef.current = null
    }
  }, [connect])

  return (
    <div className="relative w-full h-full bg-zinc-950 group/term">
      {/* Floating copy button — reads xterm's own buffer (canvas selection
          isn't a DOM selection, so the browser's native Copy can't see it) */}
      <button
        onClick={handleCopy}
        title="Copy selection (or whole terminal if nothing selected)"
        className="absolute top-2 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                   bg-zinc-800/90 backdrop-blur border border-zinc-700 text-zinc-300
                   hover:bg-zinc-700 hover:text-white transition-all
                   opacity-0 group-hover/term:opacity-100 focus:opacity-100"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      <div
        ref={containerRef}
        className="w-full h-full cursor-text"
        style={{ padding: '4px 8px' }}
        tabIndex={-1}
        onClick={() => termRef.current?.focus()}
        onFocus={() => termRef.current?.focus()}
      />
    </div>
  )
}
