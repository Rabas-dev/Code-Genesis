'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { RightPanel } from './RightPanel'
import { BottomPanel } from './BottomPanel'
import { SDLCProgressBar } from '@/components/shared/SDLCProgressBar'
import { GeneratorPanel } from '@/components/modes/generator/GeneratorPanel'
import { JudgePanel } from '@/components/modes/judge/CodeJudgePanel'
import { ArchitectPanel } from '@/components/modes/architect/ArchitectPanel'
import { DebuggerPanel } from '@/components/modes/debugger/DebuggerPanel'
import { MonacoEditor } from '@/components/shared/MonacoEditor'
import type { Project } from '@/types'
import { cn } from '@/lib/utils'

interface AppShellProps {
  project?: Project | null
}

function MainPanel() {
  const { activeMode, selectedFile } = useIDEStore()
  const { status } = useGenerationStore()

  switch (activeMode) {
    case 'generator':
      return (
        <div className="flex flex-col h-full">
          <GeneratorPanel />
        </div>
      )
    case 'judge':
      return <JudgePanel />
    case 'architect':
      return <ArchitectPanel />
    case 'debugger':
      return <DebuggerPanel />
    default:
      return (
        <div className="flex-1 h-full">
          <MonacoEditor file={selectedFile} />
        </div>
      )
  }
}

export function AppShell({ project }: AppShellProps) {
  const { sidebarOpen, rightPanelOpen, bottomPanelOpen, setCurrentProject } = useIDEStore()
  const { status } = useGenerationStore()

  // Sync project to store
  if (project) {
    // will be called on mount via useEffect in page
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Navbar */}
      <Navbar project={project} />

      {/* SDLC Progress Bar */}
      {(status === 'generating' || status === 'complete') && <SDLCProgressBar />}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            'shrink-0 border-r border-border overflow-hidden transition-all duration-200 ease-in-out',
            sidebarOpen ? 'w-60' : 'w-0'
          )}
        >
          <Sidebar project={project} />
        </div>

        {/* Center panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mode content */}
          <div className={cn(
            'flex-1 min-h-0 overflow-hidden transition-all duration-150',
            bottomPanelOpen ? '' : ''
          )}>
            <MainPanel />
          </div>

          {/* Bottom panel */}
          <div
            className={cn(
              'shrink-0 border-t border-border overflow-hidden transition-all duration-200 ease-in-out',
              bottomPanelOpen ? 'h-52' : 'h-0'
            )}
          >
            <BottomPanel />
          </div>
        </div>

        {/* Right panel */}
        <div
          className={cn(
            'shrink-0 border-l border-border overflow-hidden transition-all duration-200 ease-in-out',
            rightPanelOpen ? 'w-80' : 'w-0'
          )}
        >
          <RightPanel />
        </div>
      </div>
    </div>
  )
}
