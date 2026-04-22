'use client'

import { useState } from 'react'
import { fakeProjects } from '@/lib/fakeData'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { NewProjectModal } from '@/components/dashboard/NewProjectModal'
import { Plus, Wand2, Moon, Sun, LayoutDashboard, FolderOpen, BookOpen } from 'lucide-react'
import { useTheme } from 'next-themes'
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

const STATS = [
  { label: 'Total Projects', value: '3', icon: '📂' },
  { label: 'Generated Today', value: '1', icon: '🛠️' },
  { label: 'Code Reviews', value: '7', icon: '⚖️' },
  { label: 'Bugs Fixed', value: '12', icon: '🔧' },
]

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="h-14 border-b border-border flex items-center px-6 gap-6 sticky top-0 bg-background/95 backdrop-blur z-10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Code Genesis
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '#', label: 'Projects', icon: FolderOpen },
            { href: '#', label: 'Docs', icon: BookOpen },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarFallback className="bg-violet-600 text-white text-sm font-bold">D</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">Developer</p>
                <p className="text-xs text-muted-foreground">dev@codegenesis.ai</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-400" onClick={() => router.push('/login')}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Good morning, Developer 👋</h1>
            <p className="text-muted-foreground mt-1">What are you building today?</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{icon}</span>
              </div>
              <p className="text-3xl font-black">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Projects</h2>
            <span className="text-xs text-muted-foreground">{fakeProjects.length} projects</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {fakeProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </main>

      {modalOpen && <NewProjectModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
