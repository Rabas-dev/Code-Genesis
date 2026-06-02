'use client'

import { useState } from 'react'
import type { JudgeIssue } from '@/types'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-red-500/30',
  warning: 'border-amber-500/30',
  info: 'border-blue-500/30',
}

const CATEGORY_LABEL: Record<string, string> = {
  security: '🔐 Security',
  performance: '⚡ Performance',
  style: '✨ Style',
  architecture: '🏗️ Architecture',
}

function IssueRow({ issue }: { issue: JudgeIssue }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('border rounded-lg overflow-hidden', SEVERITY_BORDER[issue.severity] ?? 'border-border')}>
      <button
        className="flex items-start gap-2.5 w-full text-left p-2.5 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', SEVERITY_DOT[issue.severity])} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-xs font-medium text-foreground leading-snug">{issue.title}</p>
          <p className="text-[10px] text-muted-foreground leading-snug">{issue.description}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="capitalize font-medium">{issue.severity}</span>
            {issue.line && <span>Line {issue.line}</span>}
            <span className="text-violet-400">• Show Fix</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-2.5">
          <p className="text-[10px] font-semibold text-amber-400 mb-1.5">SUGGESTED FIX</p>
          <p className="text-[10px] text-foreground/80 leading-relaxed">{issue.suggestion}</p>
        </div>
      )}
    </div>
  )
}

function IssueGroup({ category, issues }: { category: string; issues: JudgeIssue[] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="space-y-1">
      <button
        className="flex items-center gap-2 w-full text-left py-1 hover:opacity-80"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold">{CATEGORY_LABEL[category] ?? category}</span>
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

export function IssueList({ issues }: { issues: JudgeIssue[] }) {
  const grouped = issues.reduce(
    (acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = []
      acc[issue.category].push(issue)
      return acc
    },
    {} as Record<string, JudgeIssue[]>
  )

  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Issues Found ({issues.length})
        </p>
        <div className="flex items-center gap-2 ml-auto">
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {warningCount} warning
            </span>
          )}
        </div>
      </div>
      {Object.entries(grouped).map(([cat, catIssues]) => (
        <IssueGroup key={cat} category={cat} issues={catIssues} />
      ))}
    </div>
  )
}
