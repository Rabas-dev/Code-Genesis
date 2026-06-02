'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { useLLMStore } from '@/store/useLLMStore'
import { toast } from '@/store/useToastStore'
import { createClient } from '@/lib/supabase/client'
import type { FileChange } from '@/app/api/chat/route'
import type { ProjectFile } from '@/types'
import {
  Send, Bot, User, Loader2, X, RotateCcw,
  FileCode2, Sparkles, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  changes?: FileChange[]
  appliedCount?: number
  error?: boolean
}

interface ChatPanelProps {
  onClose: () => void
}

const STARTERS = [
  'Explain the project structure',
  'Add a dark mode toggle',
  'Fix any TypeScript errors',
  'Add loading skeletons to all pages',
  'Make it mobile responsive',
]

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const { generatedFiles, addFile, bumpCodeVersion } = useGenerationStore()
  const { currentProject, setSelectedFile, selectedFile, setCurrentProject } = useIDEStore()

  const allFiles = generatedFiles.length > 0
    ? generatedFiles
    : (currentProject?.files ?? [])

  // Auto-apply file changes: UPDATE existing files, CREATE new ones.
  const applyChanges = useCallback(async (changes: FileChange[]): Promise<number> => {
    let applied = 0
    const createdFiles: ProjectFile[] = []
    // The scaffold owns these — never let the agent create duplicates of them.
    const RESERVED = new Set(['next.config.js', 'package.json', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.ts', 'next-env.d.ts'])
    const seen = new Set<string>()

    for (const change of changes) {
      const normalizedPath = change.path.replace(/^\//, '')
      // Skip dupes within the same response
      if (seen.has(normalizedPath)) continue
      seen.add(normalizedPath)

      const existing = allFiles.find((f) => f.path.replace(/^\//, '') === normalizedPath)

      // Reserved config files: only UPDATE if they already exist, never create new
      if (!existing && RESERVED.has(normalizedPath)) continue

      if (existing?.id) {
        // ── Update existing file ──
        const { error } = await supabase
          .from('project_files')
          .update({ content: change.content })
          .eq('id', existing.id)
        if (!error) {
          applied++
          if (selectedFile?.id === existing.id) {
            setSelectedFile({ ...selectedFile, content: change.content })
          }
        }
      } else if (currentProject?.id) {
        // ── Create new file ──
        const language = inferLanguage(normalizedPath)
        const { data, error } = await supabase
          .from('project_files')
          .insert({ project_id: currentProject.id, path: normalizedPath, content: change.content, language })
          .select()
          .single()
        if (!error && data) {
          const newFile: ProjectFile = { id: data.id, path: normalizedPath, content: change.content, language }
          createdFiles.push(newFile)
          addFile(newFile)
          applied++
        }
      }
    }

    // Merge newly created files into the current project so the explorer updates
    if (createdFiles.length && currentProject) {
      setCurrentProject({ ...currentProject, files: [...(currentProject.files ?? []), ...createdFiles] })
    }

    return applied
  }, [allFiles, selectedFile, setSelectedFile, supabase, currentProject, setCurrentProject, addFile])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    // Optimistic assistant placeholder
    const placeholderId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, {
      id: placeholderId, role: 'assistant', content: '…',
    }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          files: allFiles.map((f) => ({ path: f.path, content: f.content })),
          providers: useLLMStore.getState().getActiveProviders(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const changes: FileChange[] = data.changes ?? []
      let appliedCount = 0
      if (changes.length > 0) {
        appliedCount = await applyChanges(changes)
        // Also patch the running project on disk so Next.js HMR picks it up
        if (currentProject?.id) {
          fetch('/api/project/patch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: currentProject.id, changes }),
          }).catch(() => {})
        }
        bumpCodeVersion() // triggers Quality panel auto-rescore
        toast.success(
          `Applied ${appliedCount} file${appliedCount !== 1 ? 's' : ''}`,
          'Preview hot-reloads automatically'
        )
      }

      setMessages((prev) => prev.map((m) => m.id === placeholderId ? {
        ...m,
        content: data.reply || (changes.length > 0 ? 'Changes applied.' : ''),
        changes,
        appliedCount,
      } : m))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setMessages((prev) => prev.map((m) => m.id === placeholderId ? {
        ...m,
        content: `Error: ${msg}. Check your API key in Settings.`,
        error: true,
      } : m))
    } finally {
      setLoading(false)
    }
  }, [messages, loading, allFiles, applyChanges, currentProject, bumpCodeVersion])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 px-3 h-10 border-b border-border bg-muted/20">
        <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-violet-400" />
        </div>
        <span className="text-xs font-semibold flex-1">AI Agent</span>
        <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          Auto-apply
        </span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">

          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center animate-float">
                <Bot className="w-5 h-5 text-violet-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Fully agentic AI</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Changes are applied automatically across all files — no confirmation needed.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-150 press"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-violet-400" />
                </div>
              )}

              <div className="max-w-[85%] space-y-1.5">
                {/* Bubble */}
                {(msg.content && msg.content !== '…') && (
                  <div className={cn(
                    'rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : msg.error
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-tl-sm'
                        : 'bg-muted/60 text-foreground/90 rounded-tl-sm border border-border/40'
                  )}>
                    {msg.content}
                  </div>
                )}

                {/* Loading bubble */}
                {msg.content === '…' && (
                  <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                    <span className="text-xs text-muted-foreground">Working…</span>
                  </div>
                )}

                {/* Applied files summary */}
                {msg.changes && msg.changes.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-400">
                        Applied {msg.appliedCount}/{msg.changes.length} file{msg.changes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {msg.changes.map((c) => (
                        <div key={c.path} className="flex items-center gap-1.5">
                          <FileCode2 className="w-2.5 h-2.5 text-emerald-400/60 shrink-0" />
                          <span className="text-[10px] font-mono text-emerald-300/70 truncate">{c.path}</span>
                        </div>
                      ))}
                    </div>
                    {(msg.appliedCount ?? 0) < msg.changes.length && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Some files not found — generate the project first
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Context hint */}
      {allFiles.length > 0 && (
        <div className="shrink-0 px-3 py-1.5 border-t border-border/50 flex items-center gap-1.5">
          <FileCode2 className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/40">{allFiles.length} files in context</span>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 p-2 border-t border-border">
        <div className={cn(
          'flex gap-2 items-end rounded-xl border bg-muted/20 transition-colors p-2',
          loading ? 'border-violet-500/30' : 'border-border focus-within:border-violet-500/40'
        )}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={loading ? 'Applying changes…' : 'Ask me to change anything… (Enter)'}
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-xs resize-none focus:outline-none placeholder:text-muted-foreground/40 leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
            style={{ minHeight: '20px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 press',
              input.trim() && !loading
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-muted text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function inferLanguage(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript'
  if (path.endsWith('.jsx') || path.endsWith('.js')) return 'javascript'
  if (path.endsWith('.css')) return 'css'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.md')) return 'markdown'
  if (path.endsWith('.html')) return 'html'
  return 'plaintext'
}
