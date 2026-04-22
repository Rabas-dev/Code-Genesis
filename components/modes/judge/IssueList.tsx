'use client'

import { useState } from 'react'
import type { CodeIssue } from '@/types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

const CATEGORY_LABEL: Record<string, string> = {
  security: '🔐 Security',
  performance: '⚡ Performance',
  quality: '✨ Quality',
  architecture: '🏗️ Architecture',
}

interface IssueRowProps {
  issue: CodeIssue
}

function IssueRow({ issue }: IssueRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasFix = !!issue.fix

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="flex items-start gap-2.5 w-full text-left p-2.5 hover:bg-muted/30 transition-colors"
        onClick={() => hasFix && setExpanded(!expanded)}
      >
        <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', SEVERITY_DOT[issue.severity])} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-xs text-foreground leading-snug">{issue.description}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="capitalize">{issue.severity}</span>
            {issue.line && <span>Line {issue.line}</span>}
            {hasFix && <span className="text-amber-400">• Show Fix</span>}
          </div>
        </div>
        {hasFix && (
          expanded ? <ChevronDown className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
        )}
      </button>
      {expanded && issue.fix && (
        <div className="border-t border-border bg-muted/20 p-2.5">
          <p className="text-[10px] font-semibold text-amber-400 mb-1.5">RECOMMENDED FIX</p>
          <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {issue.fix}
          </pre>
        </div>
      )}
    </div>
  )
}

interface IssueGroupProps {
  category: string
  issues: CodeIssue[]
}

function IssueGroup({ category, issues }: IssueGroupProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="space-y-1">
      <button
        className="flex items-center gap-2 w-full text-left py-1 hover:opacity-80"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        <span className="text-xs font-semibold">{CATEGORY_LABEL[category]}</span>
        <span className="ml-auto text-xs text-muted-foreground">{issues.length}</span>
      </button>
      {open && (
        <div className="space-y-1.5 pl-2">
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}

interface IssueListProps {
  issues: CodeIssue[]
}

export function IssueList({ issues }: IssueListProps) {
  const grouped = issues.reduce(
    (acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = []
      acc[issue.category].push(issue)
      return acc
    },
    {} as Record<string, CodeIssue[]>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issues Found ({issues.length})</p>
      {Object.entries(grouped).map(([cat, catIssues]) => (
        <IssueGroup key={cat} category={cat} issues={catIssues} />
      ))}
    </div>
  )
}
