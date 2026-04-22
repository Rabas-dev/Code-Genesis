'use client'

import { useState } from 'react'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { Wand2, Zap } from 'lucide-react'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import { GeneratingOverlay } from './GeneratingOverlay'
import { cn } from '@/lib/utils'

const EXAMPLE_PROMPTS = [
  'Todo app with auth',
  'E-commerce store',
  'SaaS dashboard',
  'Blog platform',
  'Chat application',
  'Portfolio site',
]

export function GeneratorPanel() {
  const [prompt, setPrompt] = useState('')
  const { startFakeGeneration, status } = useGenerationStore()
  const { selectedFile } = useIDEStore()

  const handleGenerate = () => {
    if (!prompt.trim()) return
    startFakeGeneration()
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Generating overlay */}
      {status === 'generating' && <GeneratingOverlay />}

      {/* Prompt bar */}
      {status !== 'generating' && status !== 'complete' && (
        <div className="p-4 border-b border-border shrink-0 bg-gradient-to-b from-background to-muted/10">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-lg font-semibold">What are you building?</h2>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app... e.g. 'Build a SaaS analytics dashboard with user management, Stripe billing, and real-time charts'"
                rows={4}
                className="w-full rounded-xl border border-border bg-muted/30 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 placeholder:text-muted-foreground/60 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Try:</span>
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="px-2.5 py-1 text-xs rounded-full border border-border hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/5 transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  prompt.trim()
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Wand2 className="w-4 h-4" />
                Generate Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monaco editor for generated files */}
      {(status === 'complete') && (
        <div className="flex-1 min-h-0">
          <MonacoEditor file={selectedFile} />
        </div>
      )}

      {/* Empty state when idle */}
      {status === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center border border-violet-500/20">
            <Zap className="w-10 h-10 text-violet-400" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-lg text-foreground">Ready to build</p>
            <p className="text-sm">Describe what you want to create above and let AI do the heavy lifting</p>
          </div>
        </div>
      )}
    </div>
  )
}
