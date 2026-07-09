'use client'

import { useGenerationStore } from '@/store/useGenerationStore'
import { useIDEStore } from '@/store/useIDEStore'
import { Check, ChevronRight, FileText, Download } from 'lucide-react'
import { generateSRS, downloadMarkdown } from '@/lib/documents/generators'
import { toast } from '@/store/useToastStore'

export function RequirementsPhase() {
  const { requirementsDoc, requirementAnswers, setRequirementAnswer, confirmRequirements, status, prompt } = useGenerationStore()
  const { currentProject } = useIDEStore()

  if (!requirementsDoc) return null

  const isLoading = status === 'generating'
  const answeredCount = requirementsDoc.questions.filter((q) => requirementAnswers[q.id]?.trim()).length

  const handleDownloadSRS = () => {
    const md = generateSRS(requirementsDoc, prompt, requirementAnswers)
    downloadMarkdown(`${requirementsDoc.projectName.replace(/\s+/g, '-')}-SRS.md`, md)
    toast.success('SRS downloaded', 'Software Requirements Specification')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{requirementsDoc.projectName}</h2>
          <p className="text-xs text-muted-foreground">Phase 1 — Requirements Analysis</p>
        </div>
        <button
          onClick={handleDownloadSRS}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted hover:border-primary/30 transition-colors press"
          title="Download Software Requirements Specification"
        >
          <Download className="w-3.5 h-3.5" />
          Download SRS
        </button>
      </div>

      {/* Overview */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Overview</p>
        <p className="text-sm text-foreground/80 leading-relaxed">{requirementsDoc.overview}</p>
      </div>

      {/* Core features */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Features</p>
        <div className="grid grid-cols-1 gap-2">
          {requirementsDoc.coreFeatures.map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-foreground/80">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Stack</p>
        <div className="flex flex-wrap gap-2">
          {requirementsDoc.techStack.map((tech) => (
            <span key={tech} className="px-2.5 py-1 text-xs rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Clarifying questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Clarifying Questions
          </p>
          <span className="text-xs text-muted-foreground">
            {answeredCount}/{requirementsDoc.questions.length} answered (optional)
          </span>
        </div>

        {requirementsDoc.questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm font-medium text-foreground">{q.question}</p>
            </div>
            <input
              type="text"
              placeholder={q.hint}
              value={requirementAnswers[q.id] ?? ''}
              onChange={(e) => setRequirementAnswer(q.id, e.target.value)}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
            />
          </div>
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={() => currentProject && confirmRequirements(currentProject.id)}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Designing architecture…
          </span>
        ) : (
          <>
            Next: Design Architecture
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}
