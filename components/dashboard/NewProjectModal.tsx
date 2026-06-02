'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Wand2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const EXAMPLES = [
  'Todo app with auth',
  'E-commerce store',
  'SaaS dashboard',
  'Blog platform',
]

const STACKS = ['Next.js', 'React', 'Vue', 'Remix']

interface NewProjectModalProps {
  onClose: () => void
  onProjectCreated?: () => void | Promise<void>
}

export function NewProjectModal({ onClose, onProjectCreated }: NewProjectModalProps) {
  const [prompt, setPrompt] = useState('')
  const [stack, setStack] = useState('Next.js')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const projectName = prompt.trim().split(' ').slice(0, 4).join(' ')

    const fullPrompt = stack !== 'Next.js' ? `[Stack: ${stack}] ${prompt.trim()}` : prompt.trim()

    const { data, error: dbError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        prompt: fullPrompt,
        status: 'generating',
      })
      .select()
      .single()

    if (dbError || !data) {
      setError(dbError?.message ?? 'Failed to create project')
      setLoading(false)
      return
    }

    await onProjectCreated?.()
    onClose()
    router.push(`/ide/${data.id}`)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg p-6 space-y-5 animate-slide-up-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">New Project</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Describe what you want to build</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Build a SaaS analytics dashboard with user management, billing integration, and real-time charts..."
            rows={4}
            className="w-full rounded-xl border border-border bg-muted/30 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 placeholder:text-muted-foreground/60 transition-all"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="px-2.5 py-1 text-xs rounded-full border border-border hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/5 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Stack</p>
          <div className="flex gap-2 flex-wrap">
            {STACKS.map((s) => (
              <button
                key={s}
                onClick={() => setStack(s)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  stack === s
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-400'
                    : 'border-border hover:border-violet-500/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all duration-150 shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 disabled:opacity-50 disabled:cursor-not-allowed press"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {loading ? 'Creating project...' : 'Generate Project'}
        </button>
      </div>
    </div>
  )
}
