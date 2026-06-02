'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { NewProjectModal } from '@/components/dashboard/NewProjectModal'
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal'
import {
  Plus, Wand2, Loader2, ArrowRight,
  FolderKanban, CheckCircle2, Activity, CalendarDays,
  Scale, Network, Bug, Settings2, ChevronRight,
  LayoutGrid,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'
import { useLLMStore } from '@/store/useLLMStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()
  const openSettings = useLLMStore((s) => s.openSettings)
  const { hasOnboarded } = useOnboardingStore()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  const loadProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserEmail(user.email ?? '')

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setProjects(data.map((p) => ({
        id: p.id,
        name: p.name,
        prompt: p.prompt,
        status: p.status,
        createdAt: p.created_at,
        files: [],
      })))
    }
    setLoading(false)
  }, []) // eslint-disable-line

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?'

  const STATS = [
    { label: 'Projects', value: projects.length, Icon: FolderKanban, color: 'text-violet-400', bg: 'bg-violet-500/8' },
    { label: 'Completed', value: projects.filter(p => p.status === 'complete').length, Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
    { label: 'In Progress', value: projects.filter(p => p.status === 'generating').length, Icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/8' },
    { label: 'This Week', value: projects.filter(p => new Date(p.createdAt) > new Date(Date.now() - 7 * 86400000)).length, Icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/8' },
  ]

  const TOOLS = [
    {
      href: '/tools/judge',
      Icon: Scale,
      title: 'Code Judge',
      description: 'AI-powered code review. Get security, performance, and quality scores with line-level issue reports.',
      badge: 'Analysis',
      accent: 'amber',
    },
    {
      href: '/tools/architect',
      Icon: Network,
      title: 'Architect',
      description: 'Generate complete system blueprints — Mermaid diagrams, database schema, and API contracts.',
      badge: 'Design',
      accent: 'blue',
    },
    {
      href: '/tools/debugger',
      Icon: Bug,
      title: 'Debugger',
      description: 'Paste buggy code and an error trace. AI finds the root cause and returns a fully fixed diff.',
      badge: 'Debug',
      accent: 'red',
    },
  ]

  const accentMap: Record<string, { badge: string; border: string; icon: string; btn: string }> = {
    amber: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      border: 'hover:border-amber-500/25',
      icon: 'bg-amber-500/10 text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-500',
    },
    blue: {
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      border: 'hover:border-blue-500/25',
      icon: 'bg-blue-500/10 text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-500',
    },
    red: {
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      border: 'hover:border-red-500/25',
      icon: 'bg-red-500/10 text-red-400',
      btn: 'bg-red-600 hover:bg-red-500',
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <LLMSettingsModal />
      {!hasOnboarded && <OnboardingModal />}

      {/* Navbar */}
      <nav className="h-12 border-b border-border flex items-center px-5 gap-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Code Genesis</span>
        </Link>

        <div className="w-px h-4 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-0.5">
          {[
            { href: '/dashboard', label: 'Dashboard', Icon: LayoutGrid },
            { href: '#projects', label: 'Projects', Icon: FolderKanban },
          ].map(({ href, label, Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={openSettings}
            title="LLM Settings"
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <ThemeToggle size="md" />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md hover:bg-muted transition-colors group">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-violet-600 text-white text-[10px] font-bold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <ChevronRight className="w-3 h-3 text-muted-foreground rotate-90 group-hover:text-foreground transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium truncate">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openSettings}>
                <Settings2 className="w-3.5 h-3.5 mr-2" />
                LLM Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Hero row */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Build and manage your AI-generated applications.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-all duration-150 shadow-md shadow-violet-600/25 press"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Stats — bento grid */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map(({ label, value, Icon, color, bg }) => (
            <div
              key={label}
              className="group rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:border-border/60 hover:shadow-sm transition-all duration-200 cursor-default"
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Tools */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">AI Tools</h2>
            <span className="text-xs text-muted-foreground">Standalone — no project required</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {TOOLS.map((tool) => {
              const a = accentMap[tool.accent]
              return (
                <div
                  key={tool.href}
                  className={cn(
                    'rounded-xl border border-border bg-card p-4 space-y-3 transition-all duration-150',
                    a.border
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', a.icon)}>
                        <tool.Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-none">{tool.title}</p>
                        <span className={cn('inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium border', a.badge)}>
                          {tool.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                  <Link
                    href={tool.href}
                    className={cn(
                      'flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-white text-xs font-medium transition-colors active:scale-[0.97]',
                      a.btn
                    )}
                  >
                    Open Tool
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Projects */}
        <div id="projects" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Projects</h2>
            <span className="text-xs text-muted-foreground">{projects.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create your first project to get started</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Project
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={(id) => setProjects((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onProjectCreated={loadProjects}
        />
      )}
    </div>
  )
}
