import { create } from 'zustand'
import type { CodeFix } from '@/lib/testing/fixer'
import { toast } from '@/store/useToastStore'

export interface TestFinding {
  id: string
  route: string
  severity: 'critical' | 'warning' | 'info'
  category: 'visual' | 'console-error' | 'broken-link' | 'a11y' | 'api' | 'network'
  description: string
  screenshot?: string
}

export interface RouteResult {
  route: string
  status: 'pending' | 'running' | 'pass' | 'fail' | 'error'
  loadTimeMs?: number
  screenshot?: string
  findings: TestFinding[]
  visualScore?: number
}

export interface ApiResult {
  route: string
  status: number
  ok: boolean
  latencyMs: number
  error?: string
}

interface TestState {
  isRunning: boolean
  iteration: number
  overallScore: number | null
  routeResults: RouteResult[]
  apiResults: ApiResult[]
  fixes: CodeFix[]
  appliedFixes: Set<string>
  logs: string[]
  currentRoute: string | null
  eventSource: EventSource | null
}

interface TestActions {
  startTest: (projectId: string, port: number) => void
  stopTest: () => void
  clearResults: () => void
  markFixApplied: (filePath: string) => void
  _setEventSource: (es: EventSource | null) => void
  _addLog: (msg: string) => void
  _setRouteStatus: (route: string, update: Partial<RouteResult>) => void
  _addFinding: (finding: TestFinding) => void
  _addFix: (fix: CodeFix) => void
  _addApiResult: (result: ApiResult) => void
  _setScore: (score: number) => void
  _setCurrentRoute: (route: string | null) => void
  _setIteration: (n: number) => void
}

export const useTestStore = create<TestState & TestActions>((set, get) => ({
  isRunning: false,
  iteration: 0,
  overallScore: null,
  routeResults: [],
  apiResults: [],
  fixes: [],
  appliedFixes: new Set(),
  logs: [],
  currentRoute: null,
  eventSource: null,

  startTest: (projectId: string, port: number) => {
    get().stopTest()

    set({
      isRunning: true,
      iteration: 0,
      overallScore: null,
      routeResults: [],
      apiResults: [],
      fixes: [],
      appliedFixes: new Set(),
      logs: [],
      currentRoute: null,
    })

    const url = `/api/test/run?projectId=${encodeURIComponent(projectId)}&port=${port}`
    const es = new EventSource(url)

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const store = get()

        switch (msg.type) {
          case 'log':
            store._addLog(msg.message)
            break
          case 'route-start':
            store._setCurrentRoute(msg.route)
            store._setRouteStatus(msg.route, { route: msg.route, status: 'running', findings: [] })
            break
          case 'route-result':
            store._setRouteStatus(msg.route, {
              status: msg.status,
              loadTimeMs: msg.loadTimeMs,
              screenshot: msg.screenshot,
              findings: [],
              visualScore: msg.visualScore,
            })
            break
          case 'finding':
            store._addFinding(msg.finding)
            store._setRouteStatus(msg.finding.route, {
              status: msg.finding.severity === 'critical' ? 'fail' : 'fail',
            })
            break
          case 'api-result':
            store._addApiResult(msg.result)
            break
          case 'fix':
            store._addFix(msg.fix)
            break
          case 'score':
            store._setScore(msg.score)
            break
          case 'iteration':
            store._setIteration(msg.n)
            break
          case 'complete': {
            store._addLog('✓ Test run complete')
            store._setCurrentRoute(null)
            const score = get().overallScore
            const fixCount = get().fixes.length
            toast.success(
              `Tests complete — score ${score ?? '–'}/100`,
              fixCount > 0 ? `${fixCount} AI fix${fixCount !== 1 ? 'es' : ''} ready to apply` : 'No issues found'
            )
            set({ isRunning: false })
            es.close()
            break
          }
          case 'error':
            store._addLog(`✗ Error: ${msg.message}`)
            toast.error('Test run failed', msg.message)
            set({ isRunning: false })
            es.close()
            break
        }
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      get()._addLog('Connection lost')
      set({ isRunning: false })
      es.close()
    }

    set({ eventSource: es })
  },

  stopTest: () => {
    get().eventSource?.close()
    set({ isRunning: false, eventSource: null, currentRoute: null })
  },

  clearResults: () => set({
    overallScore: null,
    routeResults: [],
    apiResults: [],
    fixes: [],
    appliedFixes: new Set(),
    logs: [],
    currentRoute: null,
    iteration: 0,
  }),

  markFixApplied: (filePath: string) =>
    set((s) => ({ appliedFixes: new Set([...s.appliedFixes, filePath]) })),

  _setEventSource: (es) => set({ eventSource: es }),
  _addLog: (msg) => set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  _setCurrentRoute: (route) => set({ currentRoute: route }),
  _setIteration: (n) => set({ iteration: n }),
  _setScore: (score) => set({ overallScore: score }),

  _setRouteStatus: (route, update) => set((s) => {
    const existing = s.routeResults.find((r) => r.route === route)
    if (existing) {
      return { routeResults: s.routeResults.map((r) => r.route === route ? { ...r, ...update } : r) }
    }
    return { routeResults: [...s.routeResults, { route, status: 'pending', findings: [], ...update } as RouteResult] }
  }),

  _addFinding: (finding) => set((s) => {
    const routeResults = s.routeResults.map((r) =>
      r.route === finding.route ? { ...r, findings: [...r.findings, finding] } : r
    )
    return { routeResults }
  }),

  _addFix: (fix) => set((s) => ({ fixes: [...s.fixes, fix] })),

  _addApiResult: (result) => set((s) => ({ apiResults: [...s.apiResults, result] })),
}))
