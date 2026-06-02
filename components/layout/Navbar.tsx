'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { useLLMStore } from '@/store/useLLMStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import {
  Menu, Wand2, Download, Gauge,
  Settings2, GitBranch, Zap, ChevronRight, MessageSquare,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { cn } from '@/lib/utils'
import type { AppMode, Project } from '@/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { downloadProjectZip } from '@/lib/utils/download'
import { GitHubPushModal } from '@/components/shared/GitHubPushModal'
import { toast } from '@/store/useToastStore'

const MODES: { mode: AppMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'generator', label: 'Generator', icon: Zap },
  { mode: 'quality', label: 'Quality', icon: Gauge },
]

interface NavbarProps {
  project?: Project | null
}

export function Navbar({ project }: NavbarProps) {
  const { activeMode, setActiveMode, toggleSidebar, currentProject, chatOpen, toggleChat } = useIDEStore()
  const openSettings = useLLMStore((s) => s.openSettings)
  const { generatedFiles } = useGenerationStore()
  const [avatarInitial, setAvatarInitial] = useState('U')
  const [pushModalOpen, setPushModalOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email
      if (email) setAvatarInitial(email[0].toUpperCase())
    })
  }, [])

  const allFiles = generatedFiles.length > 0 ? generatedFiles : (currentProject?.files ?? [])

  const handleExport = async () => {
    if (!allFiles.length) {
      toast.error('Nothing to export', 'Generate a project first')
      return
    }
    try {
      await downloadProjectZip(allFiles, currentProject?.name ?? 'project')
      toast.success('Exported', `${allFiles.length} files downloaded as ZIP`)
    } catch {
      toast.error('Export failed', 'Could not create the ZIP')
    }
  }

  return (
    <>
      <nav className="h-10 flex items-center px-2 gap-1 border-b border-border bg-background/95 backdrop-blur-sm shrink-0 z-10">
        {/* Left cluster */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          title="Toggle sidebar"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-1.5 px-2 shrink-0">
          <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center">
            <Wand2 className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-xs tracking-tight hidden sm:block">Code Genesis</span>
        </Link>

        {project && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0 hidden sm:block" />
            <span className="text-xs text-muted-foreground truncate max-w-36 hidden sm:block">
              {project.name}
            </span>
          </>
        )}

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-1.5 shrink-0" />

        {/* Mode tabs — center */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {MODES.map(({ mode, label, icon: Icon }) => {
            const isActive = activeMode === mode
            return (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-100 shrink-0 whitespace-nowrap',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className={cn('w-3 h-3', isActive ? 'text-violet-400' : '')} />
                <span className="hidden md:block">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          {allFiles.length > 0 && (
            <button
              onClick={() => setPushModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-100 press"
            >
              <GitBranch className="w-3 h-3" />
              <span className="hidden md:block">Push</span>
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!allFiles.length}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100 press disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3" />
            <span className="hidden lg:block">Export</span>
          </button>
          <button
            onClick={toggleChat}
            title="AI Chat"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all duration-100 press',
              chatOpen
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <MessageSquare className="w-3 h-3" />
            <span className="hidden md:block">Chat</span>
          </button>
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          <button
            onClick={openSettings}
            title="LLM Settings"
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <ThemeToggle />
          <Avatar className="w-6 h-6 cursor-pointer ml-0.5">
            <AvatarFallback className="text-[10px] bg-zinc-700 text-zinc-300 font-semibold">{avatarInitial}</AvatarFallback>
          </Avatar>
        </div>
      </nav>

      <GitHubPushModal
        open={pushModalOpen}
        onClose={() => setPushModalOpen(false)}
        projectId={currentProject?.id ?? ''}
        projectName={currentProject?.name ?? project?.name ?? 'project'}
        files={allFiles}
        isGitHubConnected={false}
      />
    </>
  )
}
