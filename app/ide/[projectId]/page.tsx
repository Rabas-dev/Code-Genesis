'use client'

import { use, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useIDEStore } from '@/store/useIDEStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { fakeProjects } from '@/lib/fakeData'

interface IDEPageProps {
  params: Promise<{ projectId: string }>
}

export default function IDEPage({ params }: IDEPageProps) {
  const { projectId } = use(params)
  const { setCurrentProject } = useIDEStore()
  const { startFakeGeneration, status } = useGenerationStore()

  useEffect(() => {
    if (projectId === 'demo-project') {
      // Trigger fake generation for demo
      startFakeGeneration()
    } else {
      // Load from fake data
      const project = fakeProjects.find((p) => p.id === projectId)
      if (project) setCurrentProject(project)
    }
  }, [projectId]) // eslint-disable-line

  const project = projectId === 'demo-project'
    ? fakeProjects[0]
    : fakeProjects.find((p) => p.id === projectId) ?? fakeProjects[0]

  return <AppShell project={project} />
}
