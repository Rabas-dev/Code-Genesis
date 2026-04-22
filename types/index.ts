export type ProjectStatus = 'generating' | 'complete' | 'failed' | 'idle'
export type AppMode = 'generator' | 'judge' | 'architect' | 'debugger'
export type IssueSeverity = 'critical' | 'warning' | 'info'
export type SeniorVerdict = 'pass' | 'maybe' | 'fail'
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type SDLCPhase = 0 | 1 | 2 | 3 | 4

export interface SDLCStep {
  id: SDLCPhase
  label: string
  description: string
  icon: string
}

export interface ProjectFile {
  id: string
  path: string
  content: string
  language: string
}

export interface Project {
  id: string
  name: string
  prompt: string
  status: ProjectStatus
  createdAt: string
  files: ProjectFile[]
}

export interface CodeIssue {
  id: string
  severity: IssueSeverity
  category: 'security' | 'performance' | 'quality' | 'architecture'
  description: string
  line?: number
  fix?: string
}

export interface CodeAnalysis {
  overallScore: number
  securityScore: number
  performanceScore: number
  qualityScore: number
  architectureScore: number
  issues: CodeIssue[]
  seniorVerdict: SeniorVerdict
  summary: string
}

export interface DBTable {
  name: string
  fields: {
    name: string
    type: string
    isPrimary?: boolean
    isForeign?: boolean
    nullable?: boolean
  }[]
}

export interface APIEndpoint {
  method: HTTPMethod
  route: string
  description: string
  requestBody?: string
  responseExample?: string
}

export interface ArchitectureOutput {
  mermaidDiagram: string
  dbTables: DBTable[]
  apiEndpoints: APIEndpoint[]
  microservices: string[]
}

export interface HealingStep {
  step: 'run' | 'detect' | 'analyze' | 'fix' | 'rerun'
  label: string
  status: 'pending' | 'active' | 'complete' | 'failed'
}

export interface FileTreeNode {
  name: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  language?: string
}

export interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
}

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
}
