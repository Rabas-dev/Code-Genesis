import { create } from 'zustand'

export type StepStatus = 'pending' | 'active' | 'done' | 'error'

export interface AutoFixStep {
  id: string
  label: string
  status: StepStatus
  detail?: string
}

interface AutoFixState {
  enabled: boolean        // user toggle — auto-fix on error
  running: boolean        // a fix loop is currently in progress
  attempt: number
  maxAttempts: number
  steps: AutoFixStep[]
  lastError: string | null
  resolved: boolean       // last loop ended with the error cleared
}

interface AutoFixActions {
  toggleEnabled: () => void
  setEnabled: (v: boolean) => void
  begin: (error: string) => void
  setAttempt: (n: number) => void
  addStep: (label: string, detail?: string) => string
  updateStep: (id: string, status: StepStatus, detail?: string) => void
  finish: (resolved: boolean) => void
  reset: () => void
}

let stepCounter = 0

export const useAutoFixStore = create<AutoFixState & AutoFixActions>((set) => ({
  enabled: true,
  running: false,
  attempt: 0,
  maxAttempts: 3,
  steps: [],
  lastError: null,
  resolved: false,

  toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
  setEnabled: (v) => set({ enabled: v }),

  begin: (error) => set({ running: true, resolved: false, attempt: 0, steps: [], lastError: error }),
  setAttempt: (n) => set({ attempt: n }),

  addStep: (label, detail) => {
    const id = `step-${++stepCounter}`
    set((s) => ({ steps: [...s.steps, { id, label, status: 'active', detail }] }))
    return id
  },
  updateStep: (id, status, detail) =>
    set((s) => ({ steps: s.steps.map((st) => (st.id === id ? { ...st, status, detail: detail ?? st.detail } : st)) })),

  finish: (resolved) => set({ running: false, resolved }),
  reset: () => set({ running: false, attempt: 0, steps: [], lastError: null, resolved: false }),
}))
