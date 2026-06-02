import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderConfig } from '@/lib/ai/providers/llm-router'

export type { ProviderConfig }

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'groq',
    name: 'groq',
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    enabled: true,
    priority: 1,
  },
  {
    id: 'openai',
    name: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    enabled: false,
    priority: 2,
  },
  {
    id: 'anthropic',
    name: 'anthropic',
    apiKey: '',
    model: 'claude-haiku-4-5-20251001',
    enabled: false,
    priority: 3,
  },
  {
    id: 'gemini',
    name: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    enabled: false,
    priority: 4,
  },
]

export const PROVIDER_MODELS: Record<ProviderConfig['name'], string[]> = {
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'moonshotai/kimi-k2-instruct'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  anthropic: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
}

export const PROVIDER_META: Record<
  ProviderConfig['name'],
  { label: string; emoji: string; docsUrl: string; keyPlaceholder: string; color: string }
> = {
  groq: {
    label: 'Groq',
    emoji: '⚡',
    docsUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  openai: {
    label: 'OpenAI',
    emoji: '🤖',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  anthropic: {
    label: 'Anthropic',
    emoji: '🔮',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
    color: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  },
  gemini: {
    label: 'Google Gemini',
    emoji: '✨',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIza...',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
}

interface LLMState {
  providers: ProviderConfig[]
  settingsOpen: boolean
}

interface LLMActions {
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void
  moveProvider: (id: string, direction: 'up' | 'down') => void
  openSettings: () => void
  closeSettings: () => void
  getActiveProviders: () => ProviderConfig[]
}

export const useLLMStore = create<LLMState & LLMActions>()(
  persist(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      settingsOpen: false,

      updateProvider: (id, updates) =>
        set((s) => ({
          providers: s.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      moveProvider: (id, direction) =>
        set((s) => {
          const sorted = [...s.providers].sort((a, b) => a.priority - b.priority)
          const idx = sorted.findIndex((p) => p.id === id)
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= sorted.length) return s

          // Swap priorities
          const updated = sorted.map((p) => ({ ...p }))
          const tempPriority = updated[idx].priority
          updated[idx].priority = updated[swapIdx].priority
          updated[swapIdx].priority = tempPriority

          return { providers: updated }
        }),

      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),

      getActiveProviders: () =>
        get()
          .providers.filter((p) => p.enabled)
          .sort((a, b) => a.priority - b.priority),
    }),
    {
      name: 'code-genesis-llm-config',
      // Only persist provider configs, not UI state
      partialize: (s) => ({ providers: s.providers }),
      // Migrate away from decommissioned/invalid models saved in localStorage
      onRehydrateStorage: () => (state) => {
        if (!state) return
        let changed = false
        const fixed = state.providers.map((p) => {
          const valid = PROVIDER_MODELS[p.name] ?? []
          if (valid.length && !valid.includes(p.model)) {
            changed = true
            return { ...p, model: valid[0] }
          }
          return p
        })
        if (changed) state.providers = fixed
      },
    }
  )
)
