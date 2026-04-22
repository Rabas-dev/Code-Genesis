import { create } from 'zustand'
import type { ProjectStatus, ProjectFile, SDLCPhase } from '@/types'
import { fakeProjects } from '@/lib/fakeData'

interface GenerationState {
  status: ProjectStatus
  currentStep: string
  progress: number
  generatedFiles: ProjectFile[]
  sdlcPhase: SDLCPhase
}

interface GenerationActions {
  setStatus: (status: ProjectStatus) => void
  setCurrentStep: (step: string) => void
  setProgress: (progress: number) => void
  addFile: (file: ProjectFile) => void
  setSdlcPhase: (phase: SDLCPhase) => void
  reset: () => void
  startFakeGeneration: () => void
}

const STEPS = [
  { msg: 'Analyzing prompt & extracting requirements...', phase: 0 as SDLCPhase, progress: 8 },
  { msg: 'Intent parsed — SaaS dashboard detected...', phase: 0 as SDLCPhase, progress: 16 },
  { msg: 'Designing system architecture...', phase: 1 as SDLCPhase, progress: 24 },
  { msg: 'Building file tree: 8 files planned...', phase: 1 as SDLCPhase, progress: 32 },
  { msg: 'Generating app/page.tsx (1/5)...', phase: 2 as SDLCPhase, progress: 42 },
  { msg: 'Generating app/dashboard/page.tsx (2/5)...', phase: 2 as SDLCPhase, progress: 52 },
  { msg: 'Generating components/Header.tsx (3/5)...', phase: 2 as SDLCPhase, progress: 62 },
  { msg: 'Generating lib/db.ts (4/5)...', phase: 2 as SDLCPhase, progress: 70 },
  { msg: 'Generating lib/auth.ts (5/5)...', phase: 2 as SDLCPhase, progress: 78 },
  { msg: 'Running TypeScript validation...', phase: 3 as SDLCPhase, progress: 86 },
  { msg: 'Running ESLint & tests...', phase: 3 as SDLCPhase, progress: 93 },
  { msg: '🎉 Project ready for deployment!', phase: 4 as SDLCPhase, progress: 100 },
]

export const useGenerationStore = create<GenerationState & GenerationActions>((set, get) => ({
  status: 'idle',
  currentStep: '',
  progress: 0,
  generatedFiles: [],
  sdlcPhase: 0,

  setStatus: (status) => set({ status }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setProgress: (progress) => set({ progress }),
  addFile: (file) => set((s) => ({ generatedFiles: [...s.generatedFiles, file] })),
  setSdlcPhase: (phase) => set({ sdlcPhase: phase }),
  reset: () => set({ status: 'idle', currentStep: '', progress: 0, generatedFiles: [], sdlcPhase: 0 }),

  startFakeGeneration: () => {
    if (get().status === 'generating') return

    set({ status: 'generating', progress: 0, generatedFiles: [], sdlcPhase: 0, currentStep: 'Initializing Code Genesis engine...' })

    let stepIndex = 0
    const interval = setInterval(() => {
      if (stepIndex >= STEPS.length) {
        clearInterval(interval)
        // Load fake project files
        const completeProject = fakeProjects.find((p) => p.status === 'complete')
        set({
          status: 'complete',
          generatedFiles: completeProject?.files ?? [],
          sdlcPhase: 4,
          progress: 100,
          currentStep: '🎉 Project ready for deployment!',
        })
        return
      }

      const step = STEPS[stepIndex]
      set({ currentStep: step.msg, progress: step.progress, sdlcPhase: step.phase })
      stepIndex++
    }, 500)
  },
}))
