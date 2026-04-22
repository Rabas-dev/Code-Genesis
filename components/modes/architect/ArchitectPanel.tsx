'use client'

import { useState } from 'react'
import { fakeArchitectureOutput } from '@/lib/fakeData'
import type { ArchitectureOutput } from '@/types'
import { DiagramViewer } from './DiagramViewer'
import { DBSchemaTable } from './DBSchemaTable'
import { APIContractCard } from './APIContractCard'
import { Loader2, Building2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

const EXAMPLES = ['Uber clone', 'Airbnb clone', 'Twitter clone', 'SaaS dashboard']

export function ArchitectPanel() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<ArchitectureOutput | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = (prompt: string) => {
    if (!prompt.trim()) return
    setLoading(true)
    setTimeout(() => {
      setOutput(fakeArchitectureOutput)
      setLoading(false)
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm">Designing architecture…</p>
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
          <h2 className="text-xl font-semibold">What are you building?</h2>
          <p className="text-sm text-muted-foreground">
            Describe your system and get a complete architecture blueprint
          </p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate(input)}
            placeholder="e.g. Uber clone"
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Architecture Blueprint</p>
        <button
          onClick={() => setOutput(null)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          New →
        </button>
      </div>
      <Tabs defaultValue="diagram" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 mx-4 mt-2 w-fit">
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
          <TabsTrigger value="db">DB Schema</TabsTrigger>
          <TabsTrigger value="api">API Contracts</TabsTrigger>
        </TabsList>
        <TabsContent value="diagram" className="flex-1 min-h-0 m-0 px-4 pb-4">
          <DiagramViewer diagram={output.mermaidDiagram} />
        </TabsContent>
        <TabsContent value="db" className="flex-1 min-h-0 m-0 overflow-hidden">
          <ScrollArea className="h-full px-4 pb-4">
            <DBSchemaTable tables={output.dbTables} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="api" className="flex-1 min-h-0 m-0 overflow-hidden">
          <ScrollArea className="h-full px-4 pb-4">
            <APIContractCard endpoints={output.apiEndpoints} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
