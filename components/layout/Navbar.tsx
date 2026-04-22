'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { Menu, Wand2, Scale, Building2, Bug, Download, Moon, Sun, ChevronRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import type { AppMode, Project } from '@/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'

const MODES: { mode: AppMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'generator', label: 'Generator', icon: Wand2 },
  { mode: 'judge', label: 'Judge', icon: Scale },
  { mode: 'architect', label: 'Architect', icon: Building2 },
  { mode: 'debugger', label: 'Debugger', icon: Bug },
]

const MODE_ACCENT: Record<AppMode, string> = {
  generator: 'text-violet-400 bg-violet-500/15 border-violet-500/40',
  judge: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
  architect: 'text-blue-400 bg-blue-500/15 border-blue-500/40',
  debugger: 'text-red-400 bg-red-500/15 border-red-500/40',
}

interface NavbarProps {
  project?: Project | null
}

export function Navbar({ project }: NavbarProps) {
  const { activeMode, setActiveMode, toggleSidebar, toggleRightPanel } = useIDEStore()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <nav className="h-12 flex items-center px-3 gap-2 border-b border-border bg-background/95 backdrop-blur shrink-0 z-10">
      {/* Left */}
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Menu className="w-4 h-4" />
      </button>
      <Link href="/dashboard" className="flex items-center gap-1.5 mr-3">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
          <Wand2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm hidden sm:block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
          Code Genesis
        </span>
      </Link>

      {/* Mode tabs */}
      <div className="flex items-center gap-1 flex-1">
        {MODES.map(({ mode, label, icon: Icon }) => {
          const isActive = activeMode === mode
          return (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 border',
                isActive
                  ? MODE_ACCENT[mode]
                  : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:block">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {project && (
          <span className="text-xs text-muted-foreground truncate max-w-32 hidden lg:block">
            {project.name}
          </span>
        )}
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 hidden md:flex">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <Avatar className="w-7 h-7 cursor-pointer">
          <AvatarFallback className="text-xs bg-violet-600 text-white">D</AvatarFallback>
        </Avatar>
      </div>
    </nav>
  )
}
