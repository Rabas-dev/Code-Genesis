'use client'

import { useCallback, useRef } from 'react'
import { useAutoFixStore } from '@/store/useAutoFixStore'
import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { useLLMStore } from '@/store/useLLMStore'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/store/useToastStore'
import type { ProjectFile } from '@/types'

interface FileChange { path: string; content: string }

function inferLanguage(p: string): string {
  if (p.endsWith('.tsx') || p.endsWith('.ts')) return 'typescript'
  if (p.endsWith('.jsx') || p.endsWith('.js')) return 'javascript'
  if (p.endsWith('.css')) return 'css'
  if (p.endsWith('.json')) return 'json'
  return 'plaintext'
}

/**
 * The autonomous fix loop. Call `handleError(errorText)` whenever the terminal
 * reports a build/runtime error; it diagnoses, applies a fix, hot-patches the
 * running app, and (via the terminal's recompile signal) verifies — retrying up
 * to maxAttempts. `notifyCompiled()` is called when the dev server recompiles
 * cleanly, which resolves the current attempt.
 */
export function useAutoFix() {
  const store = useAutoFixStore
  const compiledResolverRef = useRef<(() => void) | null>(null)
  const inFlightRef = useRef(false)

  // Called by the terminal when a clean recompile happens
  const notifyCompiled = useCallback(() => {
    if (compiledResolverRef.current) {
      compiledResolverRef.current()
      compiledResolverRef.current = null
    }
  }, [])

  const waitForRecompile = (ms: number) =>
    new Promise<boolean>((resolve) => {
      let settled = false
      compiledResolverRef.current = () => { if (!settled) { settled = true; resolve(true) } }
      setTimeout(() => { if (!settled) { settled = true; compiledResolverRef.current = null; resolve(false) } }, ms)
    })

  const applyChanges = useCallback(async (changes: FileChange[]): Promise<number> => {
    const supabase = createClient()
    const gen = useGenerationStore.getState()
    const ide = useIDEStore.getState()
    const project = ide.currentProject
    if (!project?.id) return 0

    const allFiles = gen.generatedFiles.length > 0 ? gen.generatedFiles : (project.files ?? [])
    const created: ProjectFile[] = []
    let applied = 0

    for (const change of changes) {
      const norm = change.path.replace(/^\//, '')
      const existing = allFiles.find((f) => f.path.replace(/^\//, '') === norm)
      if (existing?.id) {
        const { error } = await supabase.from('project_files').update({ content: change.content }).eq('id', existing.id)
        if (!error) {
          applied++
          if (ide.selectedFile?.id === existing.id) ide.setSelectedFile({ ...ide.selectedFile, content: change.content })
        }
      } else {
        const language = inferLanguage(norm)
        const { data, error } = await supabase
          .from('project_files')
          .insert({ project_id: project.id, path: norm, content: change.content, language })
          .select().single()
        if (!error && data) {
          const nf: ProjectFile = { id: data.id, path: norm, content: change.content, language }
          created.push(nf); gen.addFile(nf); applied++
        }
      }
    }
    if (created.length) ide.setCurrentProject({ ...project, files: [...(project.files ?? []), ...created] })

    // Hot-patch the running project on disk so Next.js recompiles
    await fetch('/api/project/patch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, changes }),
    }).catch(() => {})

    gen.bumpCodeVersion()
    return applied
  }, [])

  const handleError = useCallback(async (errorText: string) => {
    const s = store.getState()
    if (!s.enabled || inFlightRef.current) return
    inFlightRef.current = true

    const gen = useGenerationStore.getState()
    const ide = useIDEStore.getState()
    const project = ide.currentProject
    const files = gen.generatedFiles.length > 0 ? gen.generatedFiles : (project?.files ?? [])
    if (!project?.id || files.length === 0) { inFlightRef.current = false; return }

    s.begin(errorText)
    // Make sure the progress feed is visible
    if (!ide.rightPanelOpen) ide.toggleRightPanel()
    toast.info('Auto-fix agent started', 'Reading the error and applying a fix…')

    let currentError = errorText
    let resolved = false

    for (let attempt = 1; attempt <= store.getState().maxAttempts; attempt++) {
      store.getState().setAttempt(attempt)
      const readStep = store.getState().addStep(`Attempt ${attempt}: reading error`, currentError.split('\n').slice(-3).join(' ').slice(0, 120))
      store.getState().updateStep(readStep, 'done')

      const analyzeStep = store.getState().addStep('Analyzing & generating fix')
      let diagnosis = ''
      let changes: FileChange[] = []
      try {
        const liveFiles = (useGenerationStore.getState().generatedFiles.length > 0
          ? useGenerationStore.getState().generatedFiles
          : (useIDEStore.getState().currentProject?.files ?? []))
        const res = await fetch('/api/autofix', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: currentError,
            files: liveFiles.map((f) => ({ path: f.path, content: f.content })),
            providers: useLLMStore.getState().getActiveProviders(),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'autofix failed')
        diagnosis = data.diagnosis ?? ''
        changes = data.changes ?? []
        store.getState().updateStep(analyzeStep, 'done', diagnosis)
      } catch (e) {
        store.getState().updateStep(analyzeStep, 'error', e instanceof Error ? e.message : 'failed')
        break
      }

      if (changes.length === 0) {
        store.getState().addStep('No fix produced', 'The agent could not determine a change')
        break
      }

      const applyStep = store.getState().addStep(`Applying ${changes.length} file change${changes.length !== 1 ? 's' : ''}`,
        changes.map((c) => c.path).join(', '))
      const applied = await applyChanges(changes)
      store.getState().updateStep(applyStep, 'done', `${applied} file(s) updated`)

      const waitStep = store.getState().addStep('Recompiling & verifying…')
      // Reset the error-dedupe so a NEW identical error can be caught next round,
      // then wait for either a clean recompile or a timeout.
      const recompiled = await waitForRecompile(12000)

      if (recompiled) {
        store.getState().updateStep(waitStep, 'done', 'Compiled cleanly')
        resolved = true
        break
      } else {
        store.getState().updateStep(waitStep, 'error', 'Still failing — retrying')
        // currentError stays; the terminal will surface a fresh error if changed
      }
    }

    store.getState().finish(resolved)
    if (resolved) toast.success('Auto-fix complete', 'The preview is running')
    else toast.error('Auto-fix incomplete', 'Could not fully resolve — check the terminal')
    inFlightRef.current = false
  }, [applyChanges, store])

  return { handleError, notifyCompiled }
}
