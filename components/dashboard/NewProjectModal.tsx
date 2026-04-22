'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Wand2 } from 'lucide-react'

const EXAMPLES = [
  'Todo app with auth',
  'E-commerce store',
  'SaaS dashboard',
  'Blog platform',
]

const STACKS = ['Next.js', 'React', 'Vue', 'Remix']

interface NewProjectModalProps {
  onClose: () => void
}

export function NewProjectModal({ onClose }: NewProjectModalProps) {
  const [prompt, setPrompt] = useState('')
  const [stack, setStack] = useState('Next.js')
  const router = useRouter()

  const handleGenerate = () => {
    if (!prompt.trim()) return
    onClose()
    router.push('/ide/demo-project')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">New Project</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Describe what you want to build</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt */}
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

        {/* Stack selector */}
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

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-4 h-4" />
          Generate Project
        </button>
      </div>
    </div>
  )
}
