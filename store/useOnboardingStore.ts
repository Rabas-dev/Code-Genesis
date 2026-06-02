import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  hasOnboarded: boolean
}

interface OnboardingActions {
  finish: () => void
  skip: () => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      finish: () => set({ hasOnboarded: true }),
      skip: () => set({ hasOnboarded: true }),
      reset: () => set({ hasOnboarded: false }),
    }),
    { name: 'code-genesis-onboarding' }
  )
)
