'use client'

import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useLLMStore } from '@/store/useLLMStore'
import {
  Wand2, ChevronRight, X,
  FileSearch, LayoutTemplate, PenTool, Code2, Rocket,
  Scale, Network, Bug,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SAMPLE_PROMPTS = [
  'Build a SaaS analytics dashboard with real-time charts',
  'Create an e-commerce store with Stripe billing',
  'Design a project management tool like Linear',
  'Build a blog platform with auth and CMS',
]

const PIPELINE = [
  { icon: FileSearch, label: 'Requirements', desc: 'Extract features and constraints from your prompt' },
  { icon: LayoutTemplate, label: 'Architecture', desc: 'Design system components, API, and database schema' },
  { icon: PenTool, label: 'Wireframe', desc: 'Lay out the UI visually on a drag-and-drop canvas' },
  { icon: Code2, label: 'Implementation', desc: 'Generate production-quality TypeScript source code' },
  { icon: Rocket, label: 'Deploy', desc: 'Run, preview, and push to GitHub in one click' },
]

const TOOLS = [
  { icon: Scale, label: 'Code Judge', desc: 'Security, performance, and quality scoring with line-level issues', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: Network, label: 'Architect', desc: 'Generate Mermaid diagrams, database schema, and API contracts', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { icon: Bug, label: 'Debugger', desc: 'Paste buggy code and get root cause analysis with a fixed diff', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
]

function Step0() {
  const [promptIdx, setPromptIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % SAMPLE_PROMPTS.length), 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl scale-150 animate-pulse-slow" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-xl shadow-violet-600/40 animate-float">
          <Wand2 className="w-8 h-8 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-shiny">Build full-stack apps with AI</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          From idea to working code in minutes — requirements, architecture, wireframe, and implementation.
        </p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 min-h-[3.5rem] flex items-center">
        <p key={promptIdx} className="text-sm text-foreground/70 font-mono animate-slide-up-fade leading-relaxed">
          &ldquo;{SAMPLE_PROMPTS[promptIdx]}&rdquo;
        </p>
      </div>
    </div>
  )
}

function Step1() {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight">A full engineering pipeline</h2>
        <p className="text-sm text-muted-foreground">Five stages from prompt to deployed app</p>
      </div>
      <div>
        {PIPELINE.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex items-start gap-3 mb-4 last:mb-0 animate-pop-in" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-violet-400" />
                </div>
                {i < PIPELINE.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[1.25rem]" />}
              </div>
              <div className="pt-1 pb-4 last:pb-0">
                <p className="text-sm font-semibold leading-none">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Step2() {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Standalone AI tools</h2>
        <p className="text-sm text-muted-foreground">No project required — use anytime</p>
      </div>
      <div className="space-y-3">
        {TOOLS.map((tool, i) => {
          const Icon = tool.icon
          return (
            <div key={tool.label} className={cn('flex items-start gap-3 rounded-xl border p-4 animate-slide-up-fade', tool.bg)} style={{ animationDelay: `${i * 100}ms` }}>
              <div className={cn('w-8 h-8 rounded-lg bg-background/50 flex items-center justify-center shrink-0', tool.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{tool.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tool.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Step3({ onFinish }: { onFinish: () => void }) {
  const openSettings = useLLMStore((s) => s.openSettings)
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Connect your AI</h2>
        <p className="text-sm text-muted-foreground">Add an API key to start generating</p>
      </div>
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400 leading-relaxed">
        Groq is free — get an API key at{' '}
        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-emerald-300">
          console.groq.com/keys
        </a>
      </div>
      <button
        onClick={() => { openSettings(); onFinish() }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
      >
        <div className="text-left">
          <p className="text-sm font-medium">Set up LLM keys</p>
          <p className="text-xs text-muted-foreground mt-0.5">Groq, OpenAI, Anthropic, and more</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
    </div>
  )
}

const STEP_COUNT = 4

export function OnboardingModal() {
  // step is LOCAL state — never persisted — so React state updates are always instant
  const [step, setStep] = useState(0)
  const { finish, skip } = useOnboardingStore()

  const nextStep = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1))
  const prevStep = () => setStep((s) => Math.max(s - 1, 0))
  const isLast = step === STEP_COUNT - 1

  const steps = [
    <Step0 key="s0" />,
    <Step1 key="s1" />,
    <Step2 key="s2" />,
    <Step3 key="s3" onFinish={finish} />,
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up-fade">
        {/* Skip */}
        <button
          onClick={skip}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
          title="Skip"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step content — key on div re-triggers CSS animation on step change */}
        <div key={step} className="p-7 animate-slide-up-fade">
          {steps[step]}
        </div>

        {/* Footer */}
        <div className="px-7 pb-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Back
            </button>
          )}

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-1 justify-center">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === step ? 'w-5 h-1.5 bg-violet-500' : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={finish}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors press"
            >
              Start building
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors press"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
