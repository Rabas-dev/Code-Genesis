'use client'

import { use, useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'
import { Loader2 } from 'lucide-react'

interface IDEPageProps {
  params: Promise<{ projectId: string }>
}

export default function IDEPage({ params }: IDEPageProps) {
  const { projectId } = use(params)
  const { setCurrentProject } = useIDEStore()
  const { startRequirements, reset } = useGenerationStore()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    reset()

    const load = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*, project_files(*)')
        .eq('id', projectId)
        .single()

      if (!data) {
        setLoading(false)
        return
      }

      const loadedProject: Project = {
        id: data.id,
        name: data.name,
        prompt: data.prompt,
        status: data.status,
        createdAt: data.created_at,
        files: (data.project_files ?? []).map((f: { id: string; path: string; content: string; language: string }) => ({
          id: f.id,
          path: f.path,
          content: f.content,
          language: f.language,
        })),
      }

      setProject(loadedProject)
      setCurrentProject(loadedProject)
      setLoading(false)

      // Auto-start generation if project is still in generating state with no files
      if (data.status === 'generating' && (data.project_files ?? []).length === 0) {
        startRequirements(data.prompt)
      }
    }

    load()
  }, [projectId]) // eslint-disable-line

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading project...</span>
        </div>
      </div>
    )
  }

  return <AppShell project={project} />
}
