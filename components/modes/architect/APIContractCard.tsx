'use client'

import { useState } from 'react'
import type { APIEndpoint } from '@/types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
}

interface APICardProps {
  endpoint: APIEndpoint
}

function APICard({ endpoint }: APICardProps) {
  const [open, setOpen] = useState(false)
  const hasDetails = !!(endpoint.requestBody || endpoint.responseExample)

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        className="flex items-center gap-3 w-full text-left p-3 hover:bg-muted/30 transition-colors"
        onClick={() => hasDetails && setOpen(!open)}
      >
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border font-mono shrink-0', METHOD_COLORS[endpoint.method])}>
          {endpoint.method}
        </span>
        <span className="font-mono text-xs text-foreground truncate">{endpoint.route}</span>
        {hasDetails && (
          open
            ? <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground shrink-0" />
        )}
      </button>
      <div className="px-3 pb-2 text-xs text-muted-foreground">{endpoint.description}</div>
      {open && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          {endpoint.requestBody && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">REQUEST BODY</p>
              <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap bg-background/50 rounded p-2 border border-border">
                {endpoint.requestBody}
              </pre>
            </div>
          )}
          {endpoint.responseExample && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">RESPONSE</p>
              <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap bg-background/50 rounded p-2 border border-border">
                {endpoint.responseExample}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface APIContractCardProps {
  endpoints: APIEndpoint[]
}

export function APIContractCard({ endpoints }: APIContractCardProps) {
  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        API Endpoints ({endpoints.length})
      </p>
      {endpoints.map((ep, i) => (
        <APICard key={i} endpoint={ep} />
      ))}
    </div>
  )
}
