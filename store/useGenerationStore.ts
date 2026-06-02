import { create } from 'zustand'
import type { ProjectStatus, ProjectFile, SDLCPhase } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/store/useToastStore'
import type { RequirementsDoc } from '@/lib/ai/stages/requirements'
import type { ArchitectureDoc } from '@/lib/ai/stages/architecture-doc'
import type { WireframeDoc } from '@/lib/ai/stages/wireframe'

export type SDLCStep = 'prompt' | 'requirements' | 'architecture' | 'design' | 'implementation' | 'complete' | 'failed'

interface GenerationState {
  // Core
  status: ProjectStatus
  currentStep: string
  progress: number
  generatedFiles: ProjectFile[]
  sdlcPhase: SDLCPhase
  // Multi-phase
  sdlcStep: SDLCStep
  prompt: string
  requirementsDoc: RequirementsDoc | null
  requirementAnswers: Record<string, string>
  architectureDoc: ArchitectureDoc | null
  wireframeDoc: WireframeDoc | null
  logs: string[]
  // Increments whenever project code changes (chat edit, manual save) — used
  // by the Quality panel to auto-rescore.
  codeVersion: number
}

interface GenerationActions {
  setStatus: (status: ProjectStatus) => void
  setCurrentStep: (step: string) => void
  setProgress: (progress: number) => void
  addFile: (file: ProjectFile) => void
  setSdlcPhase: (phase: SDLCPhase) => void
  appendLog: (msg: string) => void
  bumpCodeVersion: () => void
  reset: () => void
  // Multi-phase actions
  startRequirements: (prompt: string) => Promise<void>
  setRequirementAnswer: (questionId: string, answer: string) => void
  confirmRequirements: (projectId: string) => Promise<void>
  confirmArchitecture: (projectId: string) => Promise<void>
  confirmDesign: (layoutDescription: string, projectId: string) => Promise<void>
  startGeneration: (prompt: string, projectId: string) => Promise<void>
}

const INITIAL_STATE: GenerationState = {
  status: 'idle',
  currentStep: '',
  progress: 0,
  generatedFiles: [],
  sdlcPhase: 0,
  sdlcStep: 'prompt',
  prompt: '',
  requirementsDoc: null,
  requirementAnswers: {},
  architectureDoc: null,
  wireframeDoc: null,
  logs: [],
  codeVersion: 0,
}

function getProviders() {
  try {
    // Lazy import to avoid circular dep — access store state directly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useLLMStore } = require('@/store/useLLMStore')
    return useLLMStore.getState().getActiveProviders()
  } catch {
    return undefined
  }
}

export const useGenerationStore = create<GenerationState & GenerationActions>((set, get) => ({
  ...INITIAL_STATE,

  setStatus: (status) => set({ status }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setProgress: (progress) => set({ progress }),
  addFile: (file) => set((s) => ({ generatedFiles: [...s.generatedFiles, file] })),
  setSdlcPhase: (phase) => set({ sdlcPhase: phase }),
  appendLog: (msg) => set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  bumpCodeVersion: () => set((s) => ({ codeVersion: s.codeVersion + 1 })),
  reset: () => set({ ...INITIAL_STATE }),
  setRequirementAnswer: (questionId, answer) =>
    set((s) => ({ requirementAnswers: { ...s.requirementAnswers, [questionId]: answer } })),

  // Phase 1: Analyze prompt → generate requirements + questions
  startRequirements: async (prompt: string) => {
    if (get().status === 'generating') return
    const log = (msg: string) => get().appendLog(msg)
    set({ ...INITIAL_STATE, status: 'generating', prompt, sdlcStep: 'requirements', sdlcPhase: 0, currentStep: 'Analyzing requirements...', progress: 10 })
    log('Starting requirements analysis...')
    log(`Prompt: "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`)

    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, providers: getProviders() }),
      })
      if (!res.ok) throw new Error('Requirements failed')
      const doc: RequirementsDoc = await res.json()
      log(`Requirements extracted — ${doc.coreFeatures?.length ?? 0} core features identified`)
      log('Waiting for requirement confirmation...')
      set({ requirementsDoc: doc, status: 'idle', progress: 25, sdlcPhase: 0, currentStep: '' })
    } catch {
      log('ERROR: Requirements analysis failed')
      set({ status: 'failed', currentStep: 'Failed to analyze requirements. Try again.' })
    }
  },

  // Phase 2: Submit answered requirements → generate architecture doc
  confirmRequirements: async (projectId: string) => {
    const { prompt, requirementsDoc, requirementAnswers } = get()
    if (!requirementsDoc) return
    const log = (msg: string) => get().appendLog(msg)
    log('Requirements confirmed — designing system architecture...')
    set({ status: 'generating', sdlcStep: 'architecture', sdlcPhase: 1, currentStep: 'Designing system architecture...', progress: 35 })

    try {
      const res = await fetch('/api/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, requirements: requirementsDoc, answers: requirementAnswers, providers: getProviders() }),
      })
      if (!res.ok) throw new Error('Architecture failed')
      const doc: ArchitectureDoc = await res.json()

      const supabase = createClient()
      await supabase.from('projects').update({ name: doc.projectName }).eq('id', projectId)

      log(`Architecture complete — project: "${doc.projectName}", ${doc.components?.length ?? 0} components`)
      log('Waiting for architecture confirmation...')
      set({ architectureDoc: doc, status: 'idle', progress: 50, currentStep: '' })
    } catch {
      log('ERROR: Architecture generation failed')
      set({ status: 'failed', currentStep: 'Failed to generate architecture. Try again.' })
    }
  },

  // Phase 3: Confirm architecture → generate wireframe for design canvas
  confirmArchitecture: async (_projectId: string) => {
    const { prompt, architectureDoc } = get()
    if (!architectureDoc) return
    const log = (msg: string) => get().appendLog(msg)
    log('Architecture confirmed — generating wireframe...')
    set({ status: 'generating', sdlcStep: 'architecture', sdlcPhase: 1, currentStep: 'Generating wireframe...', progress: 52 })

    try {
      const res = await fetch('/api/wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, architecture: architectureDoc, providers: getProviders() }),
      })
      if (!res.ok) throw new Error('Wireframe failed')
      const wireframe = await res.json()
      log(`Wireframe generated — ${wireframe.components?.length ?? 0} UI components placed`)
      log('Opening design canvas...')
      set({ wireframeDoc: wireframe, status: 'idle', sdlcStep: 'design', sdlcPhase: 2, progress: 55, currentStep: '' })
    } catch {
      log('ERROR: Wireframe generation failed')
      set({ status: 'failed', sdlcStep: 'failed', currentStep: 'Wireframe generation failed. Try again.' })
    }
  },

  // Phase 4: Confirm design canvas → generate code with layout hints
  confirmDesign: async (layoutDescription: string, projectId: string) => {
    const { prompt, requirementsDoc, architectureDoc, requirementAnswers } = get()
    if (!architectureDoc || !requirementsDoc) return
    const log = (msg: string) => get().appendLog(msg)
    log('Design confirmed — starting code generation...')
    if (layoutDescription) log('Layout hints captured from wireframe canvas')
    set({ status: 'generating', sdlcStep: 'implementation', sdlcPhase: 3, currentStep: 'Generating source files...', progress: 65 })

    try {
      log('Calling generation pipeline (requirements + architecture + layout)...')
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, requirements: requirementsDoc, architecture: architectureDoc, answers: requirementAnswers, layoutDescription, providers: getProviders() }),
      })
      if (!res.ok) throw new Error('Generation failed')

      log('Pipeline complete — processing generated files...')
      set({ currentStep: 'Running validation...', progress: 85, sdlcPhase: 3 })
      const data = await res.json()
      const { generation } = data.stages ?? {}

      if (!generation?.files?.length) throw new Error('No files generated')

      const files: ProjectFile[] = generation.files.map((f: { path: string; content: string }, i: number) => ({
        id: `${projectId}-f${i}`,
        path: f.path,
        content: f.content,
        language: inferLanguage(f.path),
      }))

      log(`Saving ${files.length} files to database...`)
      const supabase = createClient()
      await supabase.from('project_files').insert(
        files.map((f) => ({ project_id: projectId, path: f.path, content: f.content, language: f.language }))
      )
      await supabase.from('projects').update({ status: 'complete' }).eq('id', projectId)

      log(`Project complete — ${files.length} files generated and saved`)
      set({ status: 'complete', generatedFiles: files, sdlcStep: 'complete', sdlcPhase: 4, progress: 100, currentStep: 'Project ready!' })
      toast.success('Project generated', `${files.length} files ready — click Run to preview`)
    } catch {
      log('ERROR: Code generation failed')
      set({ status: 'failed', sdlcStep: 'failed', currentStep: 'Code generation failed. Try again.' })
      toast.error('Generation failed', 'Check your API key and try again')
    }
  },

  // Legacy: direct generation without multi-phase (used for existing projects)
  startGeneration: async (prompt: string, projectId: string) => {
    if (get().status === 'generating') return
    set({ status: 'generating', prompt, sdlcStep: 'implementation', progress: 0, generatedFiles: [], sdlcPhase: 0, currentStep: 'Initializing...' })

    try {
      set({ currentStep: 'Analyzing prompt...', progress: 20, sdlcPhase: 0 })
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, providers: getProviders() }),
      })
      if (!res.ok) throw new Error('Failed')

      set({ currentStep: 'Generating files...', progress: 60, sdlcPhase: 2 })
      const data = await res.json()
      const { generation } = data.stages ?? {}
      if (!generation?.files?.length) throw new Error('No files')

      const files: ProjectFile[] = generation.files.map((f: { path: string; content: string }, i: number) => ({
        id: `${projectId}-f${i}`,
        path: f.path,
        content: f.content,
        language: inferLanguage(f.path),
      }))

      set({ currentStep: 'Saving...', progress: 85, sdlcPhase: 3 })
      const supabase = createClient()
      await supabase.from('project_files').insert(
        files.map((f) => ({ project_id: projectId, path: f.path, content: f.content, language: f.language }))
      )
      await supabase.from('projects').update({ status: 'complete' }).eq('id', projectId)

      set({ status: 'complete', generatedFiles: files, sdlcStep: 'complete', sdlcPhase: 4, progress: 100, currentStep: 'Project ready!' })
    } catch {
      set({ status: 'failed', sdlcStep: 'failed', currentStep: 'Generation failed.' })
    }
  },
}))

function inferLanguage(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript'
  if (path.endsWith('.jsx') || path.endsWith('.js')) return 'javascript'
  if (path.endsWith('.css')) return 'css'
  if (path.endsWith('.json')) return 'json'
  if (path.endsWith('.md')) return 'markdown'
  if (path.endsWith('.html')) return 'html'
  return 'plaintext'
}
