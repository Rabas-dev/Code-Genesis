'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { NewProjectModal } from '@/components/dashboard/NewProjectModal'
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal'
import {
  Plus, Wand2, Loader2,
  Settings2, ChevronRight, Search,
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

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
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

  const completed = projects.filter(p => p.status === 'complete').length
  const thisWeek  = projects.filter(p => new Date(p.createdAt) > new Date(Date.now() - 7 * 86400e3)).length

  const filtered = search.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.prompt.toLowerCase().includes(search.toLowerCase())
      )
    : projects

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LLMSettingsModal />
      {!hasOnboarded && <OnboardingModal />}

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="h-12 border-b border-border flex items-center px-5 gap-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Code Genesis</span>
        </Link>

        <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

        {/* Stats pill — inline, no cards */}
        {!loading && projects.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground select-none">
            <span className="tabular-nums">
              <span className="font-semibold text-foreground">{projects.length}</span> projects
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="tabular-nums">
              <span className="font-semibold text-foreground">{completed}</span> complete
            </span>
            {thisWeek > 0 && (
              <>
                <span className="w-px h-3 bg-border" />
                <span className="tabular-nums">
                  <span className="font-semibold text-foreground">{thisWeek}</span> this week
                </span>
              </>
            )}
          </div>
        )}

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
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
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
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">

        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Loading…' : projects.length === 0
                ? 'No projects yet — start with a prompt below'
                : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-medium text-sm transition-opacity shadow-sm press"
          >
            <Plus className="w-3.5 h-3.5" />
            New project
          </button>
        </div>

        {/* Search — only when there's something to search */}
        {projects.length > 4 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter projects…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-muted/40 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all"
            />
          </div>
        )}

        {/* Project grid */}
        {loading ? (
          /* Skeleton cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-lg bg-muted" />
                  <div className="w-2 h-2 rounded-full bg-muted mt-1" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted" />
                  <div className="h-2.5 w-full rounded bg-muted/60" />
                  <div className="h-2.5 w-4/5 rounded bg-muted/40" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-2.5 w-14 rounded bg-muted/50" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium">No results for &ldquo;{search}&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different name or prompt keyword</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state — teaches the interface */
          <EmptyState onNew={() => setModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={(id) => setProjects((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </div>
        )}
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

function EmptyState({ onNew }: { onNew: () => void }) {
  const EXAMPLES = [
    'SaaS dashboard with charts and user table',
    'E-commerce product page with cart',
    'Chat app with rooms and real-time messages',
    'Portfolio site with project showcase',
  ]
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-8 py-14 flex flex-col items-center text-center gap-6">
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Wand2 className="w-6 h-6 text-primary" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h2 className="text-base font-semibold">Build something</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Describe what you want — Code Genesis handles requirements, architecture, code generation, and live preview.
        </p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-medium text-sm transition-opacity shadow-sm press"
      >
        <Plus className="w-4 h-4" />
        Start with a prompt
      </button>
      <div className="w-full max-w-md space-y-1.5">
        <p className="text-[11px] text-muted-foreground">Try one of these:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={onNew}
              className="text-[11px] px-2.5 py-1 rounded-md border border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5 text-muted-foreground transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
