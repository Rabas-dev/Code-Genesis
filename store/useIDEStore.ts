import { create } from 'zustand'
import type { AppMode, Project, ProjectFile, DebuggerResult } from '@/types'

interface IDEState {
  activeMode: AppMode
  selectedFile: ProjectFile | null
  sidebarOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  bottomPanelTab: 'logs' | 'tests' | 'terminal'
  currentProject: Project | null
  previewPort: number | null
  showPreview: boolean
  debuggerResult: DebuggerResult | null
  chatOpen: boolean
  bottomPanelHeight: number
  bottomPanelMaximized: boolean
}

interface IDEActions {
  setActiveMode: (mode: AppMode) => void
  setSelectedFile: (file: ProjectFile | null) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setBottomPanelTab: (tab: 'logs' | 'tests' | 'terminal') => void
  setCurrentProject: (project: Project | null) => void
  setPreviewPort: (port: number | null) => void
  togglePreview: () => void
  openTerminal: () => void
  setDebuggerResult: (result: DebuggerResult | null) => void
  toggleChat: () => void
  setBottomPanelHeight: (h: number) => void
  toggleBottomPanelMaximized: () => void
}

export const BOTTOM_PANEL_MIN = 120
export const BOTTOM_PANEL_DEFAULT = 288

export const useIDEStore = create<IDEState & IDEActions>((set) => ({
  activeMode: 'generator',
  selectedFile: null,
  sidebarOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: true,
  bottomPanelTab: 'logs',
  currentProject: null,
  previewPort: null,
  showPreview: false,
  debuggerResult: null,
  chatOpen: false,
  bottomPanelHeight: BOTTOM_PANEL_DEFAULT,
  bottomPanelMaximized: false,

  setActiveMode: (mode) => set({ activeMode: mode }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setPreviewPort: (port) => set({ previewPort: port }),
  togglePreview: () => set((s) => ({ showPreview: !s.showPreview })),
  openTerminal: () => set({ bottomPanelOpen: true, bottomPanelTab: 'terminal' }),
  setDebuggerResult: (result) => set({ debuggerResult: result }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setBottomPanelHeight: (h) => set({ bottomPanelHeight: Math.max(BOTTOM_PANEL_MIN, h), bottomPanelMaximized: false }),
  toggleBottomPanelMaximized: () => set((s) => ({ bottomPanelMaximized: !s.bottomPanelMaximized, bottomPanelOpen: true })),
}))
