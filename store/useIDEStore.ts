import { create } from 'zustand'
import type { AppMode, Project, ProjectFile } from '@/types'

interface IDEState {
  activeMode: AppMode
  selectedFile: ProjectFile | null
  sidebarOpen: boolean
  rightPanelOpen: boolean
  bottomPanelOpen: boolean
  bottomPanelTab: 'logs' | 'tests' | 'console'
  currentProject: Project | null
}

interface IDEActions {
  setActiveMode: (mode: AppMode) => void
  setSelectedFile: (file: ProjectFile | null) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setBottomPanelTab: (tab: 'logs' | 'tests' | 'console') => void
  setCurrentProject: (project: Project | null) => void
}

export const useIDEStore = create<IDEState & IDEActions>((set) => ({
  activeMode: 'generator',
  selectedFile: null,
  sidebarOpen: true,
  rightPanelOpen: true,
  bottomPanelOpen: true,
  bottomPanelTab: 'logs',
  currentProject: null,

  setActiveMode: (mode) => set({ activeMode: mode }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
  setCurrentProject: (project) => set({ currentProject: project }),
}))
