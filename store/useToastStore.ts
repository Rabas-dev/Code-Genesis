import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  /** ms before auto-dismiss; 0 = sticky (caller dismisses manually) */
  duration: number
}

interface ToastState {
  toasts: Toast[]
}

interface ToastActions {
  toast: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string
  update: (id: string, patch: Partial<Omit<Toast, 'id'>>) => void
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState & ToastActions>((set, get) => ({
  toasts: [],

  toast: ({ variant, title, description, duration }) => {
    const id = `t${++counter}`
    const finalDuration = duration ?? (variant === 'loading' ? 0 : variant === 'error' ? 5000 : 3000)
    set((s) => ({ toasts: [...s.toasts, { id, variant, title, description, duration: finalDuration }] }))
    if (finalDuration > 0) {
      setTimeout(() => get().dismiss(id), finalDuration)
    }
    return id
  },

  update: (id, patch) =>
    set((s) => {
      const next = s.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t))
      // If a loading toast resolved to success/error, give it an auto-dismiss
      const updated = next.find((t) => t.id === id)
      if (updated && patch.variant && patch.variant !== 'loading' && updated.duration === 0) {
        const d = patch.variant === 'error' ? 5000 : 3000
        setTimeout(() => get().dismiss(id), d)
        return { toasts: next.map((t) => (t.id === id ? { ...t, duration: d } : t)) }
      }
      return { toasts: next }
    }),

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Convenience helpers for non-React callers
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().toast({ variant: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().toast({ variant: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().toast({ variant: 'info', title, description }),
  loading: (title: string, description?: string) =>
    useToastStore.getState().toast({ variant: 'loading', title, description }),
  update: (id: string, patch: Partial<Omit<Toast, 'id'>>) => useToastStore.getState().update(id, patch),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
}
