'use client'

import Link from 'next/link'
import { Wand2, ArrowLeft, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { JudgePanel } from '@/components/modes/judge/CodeJudgePanel'

export default function JudgePage() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Navbar */}
      <nav className="h-12 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-background/95 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-sm bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Code Genesis
          </span>
        </Link>

        <span className="text-muted-foreground/40">/</span>

        <div className="flex items-center gap-1.5">
          <span className="text-base">⚖️</span>
          <span className="text-sm font-semibold">Code Judge</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
            AI
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <p className="text-xs text-muted-foreground hidden md:block">
            Paste or upload code to get a senior-level AI review
          </p>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          >
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Panel fills rest of screen */}
      <div className="flex-1 min-h-0">
        <JudgePanel />
      </div>
    </div>
  )
}
