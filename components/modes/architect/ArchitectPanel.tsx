'use client'

import { useState } from 'react'
import type { ArchitectureResult } from '@/types'
import { DiagramViewer } from './DiagramViewer'
import { Loader2, Building2, Key, Link2, Copy, Check, Database, ArrowRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLLMStore } from '@/store/useLLMStore'

// ── DB Schema Tab ─────────────────────────────────────────────────────────────

type SchemaTable = ArchitectureResult['databaseSchema']['tables'][number]

function buildDDL(tables: SchemaTable[]): string {
  return tables.map((t) => {
    const cols = t.columns.map((c) => {
      const parts = [`  ${c.name} ${c.type}`]
      if (c.primary) parts.push('PRIMARY KEY')
      if (c.foreignKey) parts.push(`REFERENCES ${c.foreignKey}`)
      return parts.join(' ')
    }).join(',\n')
    return `CREATE TABLE ${t.name} (\n${cols}\n);`
  }).join('\n\n')
}

function DBSchemaTab({ tables }: { tables: SchemaTable[] }) {
  const [copied, setCopied] = useState(false)

  // Build a FK relationship map: table → [{from, to}]
  const relationships: { fromTable: string; fromCol: string; toRef: string }[] = []
  for (const t of tables) {
    for (const col of t.columns) {
      if (col.foreignKey) {
        relationships.push({ fromTable: t.name, fromCol: col.name, toRef: col.foreignKey })
      }
    }
  }

  const handleCopySQL = () => {
    const ddl = buildDDL(tables)
    navigator.clipboard.writeText(ddl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <ScrollArea className="h-full px-4 pb-4">
      <div className="pt-3 space-y-4">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tables.length} {tables.length === 1 ? 'Table' : 'Tables'}
            </span>
          </div>
          <button
            onClick={handleCopySQL}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:border-blue-500/40 hover:bg-blue-500/5 text-xs text-muted-foreground hover:text-blue-400 transition-all"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy SQL DDL'}
          </button>
        </div>

        {/* Relationship legend */}
        {relationships.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Relationships</p>
            {relationships.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-blue-400">{r.fromTable}</span>
                <span className="font-mono text-muted-foreground">.{r.fromCol}</span>
                <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
                <span className="font-mono text-violet-400">{r.toRef}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold">FK</span>
              </div>
            ))}
          </div>
        )}

        {/* Tables */}
        {tables.map((table) => (
          <div key={table.name} className="rounded-xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="px-3 py-2.5 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-border flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                <Database className="w-3 h-3 text-blue-400" />
              </div>
              <p className="text-xs font-bold font-mono text-blue-400">{table.name}</p>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {table.columns.length} {table.columns.length === 1 ? 'column' : 'columns'}
              </span>
            </div>

            {/* Columns */}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium w-4" />
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Column</th>
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Constraints</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col) => (
                  <tr key={col.name} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                    {/* Icon column */}
                    <td className="px-3 py-2 w-4">
                      {col.primary
                        ? <Key className="w-3 h-3 text-amber-400" />
                        : col.foreignKey
                          ? <Link2 className="w-3 h-3 text-violet-400" />
                          : null}
                    </td>
                    {/* Column name */}
                    <td className={`px-3 py-2 font-mono ${col.primary ? 'text-amber-300 font-semibold' : col.foreignKey ? 'text-violet-300' : 'text-foreground'}`}>
                      {col.name}
                    </td>
                    {/* Type */}
                    <td className="px-3 py-2 text-blue-400 font-mono">{col.type}</td>
                    {/* Constraint badges */}
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap items-center">
                        {col.primary && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 font-bold">PK</span>
                        )}
                        {col.foreignKey && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/15 text-violet-400 border border-violet-500/20 font-bold">
                            FK → {col.foreignKey}
                          </span>
                        )}
                        {!col.primary && !col.foreignKey && (
                          <span className="text-[10px] text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {tables.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No database tables defined</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

const EXAMPLES = ['Uber clone', 'Airbnb clone', 'Twitter clone', 'SaaS dashboard', 'E-commerce store']

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const NODE_ICONS: Record<string, string> = {
  client: '📱',
  server: '⚙️',
  database: '🐘',
  service: '🔧',
}

export function ArchitectPanel() {
  const [input, setInput] = useState('')
  const [requirements, setRequirements] = useState('')
  const [output, setOutput] = useState<ArchitectureResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async (name: string) => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    setOutput(null)
    try {
      const res = await fetch('/api/architect/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: name, requirements, providers: useLLMStore.getState().getActiveProviders() }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data: ArchitectureResult = await res.json()
      setOutput(data)
    } catch {
      setError('Architecture generation failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm">Designing architecture…</p>
        <p className="text-xs text-muted-foreground/60">AI is generating your system blueprint</p>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto border border-blue-500/20">
            <Building2 className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold">Architecture Generator</h2>
          <p className="text-sm text-muted-foreground">Describe your system to get a complete AI-generated architecture blueprint</p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate(input)}
            placeholder="e.g. Uber clone"
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Additional requirements (optional): e.g. needs real-time updates, microservices, PostgreSQL..."
            rows={3}
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder:text-muted-foreground/50"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 flex-wrap">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setInput(ex); handleGenerate(ex) }}
                className="px-3 py-1 text-xs rounded-full border border-border hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleGenerate(input)}
            disabled={!input.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            Generate Architecture
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border bg-muted/20 shrink-0 flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold">{output.projectName}</p>
          <p className="text-xs text-muted-foreground">{output.systemOverview}</p>
        </div>
        <button
          onClick={() => setOutput(null)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
        >
          New →
        </button>
      </div>

      <Tabs defaultValue="diagram" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 mx-4 mt-2 w-fit">
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
          <TabsTrigger value="nodes">Components</TabsTrigger>
          <TabsTrigger value="db">DB Schema</TabsTrigger>
          <TabsTrigger value="api">API Routes</TabsTrigger>
          <TabsTrigger value="stack">Tech Stack</TabsTrigger>
        </TabsList>

        {/* Mermaid diagram */}
        <TabsContent value="diagram" className="flex-1 min-h-0 m-0 px-4 pb-4">
          <DiagramViewer diagram={output.mermaidDiagram} />
        </TabsContent>

        {/* System nodes */}
        <TabsContent value="nodes" className="flex-1 min-h-0 m-0 overflow-hidden">
          <ScrollArea className="h-full px-4 pb-4">
            <div className="pt-3 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Components</p>
                <div className="grid grid-cols-2 gap-2">
                  {output.systemDiagram.nodes.map((node) => (
                    <div key={node.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{NODE_ICONS[node.type] ?? '📦'}</span>
                        <span className="text-xs font-medium">{node.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">{node.type}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connections</p>
                {output.systemDiagram.edges.map((edge, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-foreground font-mono">{edge.from}</span>
                    <span>→</span>
                    <span className="text-foreground font-mono">{edge.to}</span>
                    {edge.label && <span className="text-violet-400">({edge.label})</span>}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* DB Schema */}
        <TabsContent value="db" className="flex-1 min-h-0 m-0 overflow-hidden">
          <DBSchemaTab tables={output.databaseSchema.tables} />
        </TabsContent>

        {/* API Routes */}
        <TabsContent value="api" className="flex-1 min-h-0 m-0 overflow-hidden">
          <ScrollArea className="h-full px-4 pb-4">
            <div className="pt-3 space-y-2">
              {output.apiRoutes.map((route, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${METHOD_COLORS[route.method] ?? METHOD_COLORS.GET}`}>
                      {route.method}
                    </span>
                    <span className="font-mono text-xs text-foreground">{route.route}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{route.description}</p>
                  {route.requestBody && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Request</p>
                      <pre className="text-[10px] font-mono bg-muted/40 rounded p-2 overflow-x-auto text-foreground/80">{route.requestBody}</pre>
                    </div>
                  )}
                  {route.responseBody && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Response</p>
                      <pre className="text-[10px] font-mono bg-muted/40 rounded p-2 overflow-x-auto text-foreground/80">{route.responseBody}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tech Stack */}
        <TabsContent value="stack" className="flex-1 min-h-0 m-0 overflow-hidden">
          <ScrollArea className="h-full px-4 pb-4">
            <div className="pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Stack</p>
              <div className="flex flex-wrap gap-2">
                {output.techStack.map((tech) => (
                  <span key={tech} className="px-3 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-medium">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
