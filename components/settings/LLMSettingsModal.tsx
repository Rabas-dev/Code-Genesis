'use client'

import { useState } from 'react'
import { useLLMStore, PROVIDER_META, PROVIDER_MODELS } from '@/store/useLLMStore'
import type { ProviderConfig } from '@/store/useLLMStore'
import { X, ChevronUp, ChevronDown, Eye, EyeOff, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

function ProviderRow({
  provider,
  isFirst,
  isLast,
}: {
  provider: ProviderConfig
  isFirst: boolean
  isLast: boolean
}) {
  const { updateProvider, moveProvider } = useLLMStore()
  const meta = PROVIDER_META[provider.name]
  const models = PROVIDER_MODELS[provider.name]
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMsg('')
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (data.success) {
        setTestStatus('ok')
        setTestMsg(data.response ?? 'Connection successful')
      } else {
        setTestStatus('fail')
        setTestMsg(data.error ?? 'Test failed')
      }
    } catch {
      setTestStatus('fail')
      setTestMsg('Network error')
    }
    setTimeout(() => setTestStatus('idle'), 4000)
  }

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-colors',
      provider.enabled ? `${meta.color} border-opacity-50` : 'border-border bg-muted/10'
    )}>
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Priority arrows */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={() => moveProvider(provider.id, 'up')}
            disabled={isFirst}
            className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => moveProvider(provider.id, 'down')}
            disabled={isLast}
            className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Provider identity */}
        <span className="text-xl">{meta.emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{meta.label}</p>
            <span className="text-[10px] text-muted-foreground border border-border rounded px-1">
              Priority {provider.priority}
            </span>
          </div>
          <a
            href={meta.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 w-fit"
          >
            Get API key <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {/* Enable toggle */}
        <button
          onClick={() => updateProvider(provider.id, { enabled: !provider.enabled })}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors shrink-0',
            provider.enabled ? 'bg-emerald-500' : 'bg-muted border border-border'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
              provider.enabled ? 'left-5' : 'left-0.5'
            )}
          />
        </button>
      </div>

      {/* API Key input */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          API Key
        </label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={provider.apiKey}
              onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
              placeholder={meta.keyPlaceholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50 pr-8 placeholder:text-muted-foreground/40"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing' || !provider.apiKey.trim()}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-border bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
          >
            {testStatus === 'testing' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : testStatus === 'ok' ? (
              <CheckCircle className="w-3 h-3 text-emerald-400" />
            ) : testStatus === 'fail' ? (
              <XCircle className="w-3 h-3 text-red-400" />
            ) : null}
            {testStatus === 'testing' ? 'Testing…' : 'Test'}
          </button>
        </div>
        {testMsg && (
          <p className={cn('text-[10px]', testStatus === 'ok' ? 'text-emerald-400' : 'text-red-400')}>
            {testMsg}
          </p>
        )}
      </div>

      {/* Model selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Model
        </label>
        <select
          value={provider.model}
          onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-foreground"
        >
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function LLMSettingsModal() {
  const { providers, settingsOpen, closeSettings } = useLLMStore()

  if (!settingsOpen) return null

  const sorted = [...providers].sort((a, b) => a.priority - b.priority)
  const enabledCount = providers.filter((p) => p.enabled).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSettings} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <span className="text-base">🤖</span>
          </div>
          <div>
            <h2 className="text-sm font-bold">LLM Providers</h2>
            <p className="text-xs text-muted-foreground">
              Configure API keys and fallback order. {enabledCount} provider{enabledCount !== 1 ? 's' : ''} active.
            </p>
          </div>
          <button
            onClick={closeSettings}
            className="ml-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Providers */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Info banner */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex gap-2">
            <span className="text-amber-400 shrink-0 text-sm">⚠️</span>
            <p className="text-[10px] text-amber-300/80 leading-relaxed">
              API keys are stored locally in your browser (localStorage). They are never sent to our servers — they go directly to each AI provider.
            </p>
          </div>

          {/* How fallback works */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">How it works</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Providers are tried top-to-bottom. If the first fails (rate limit, invalid key, etc.), the next enabled provider is tried automatically. Leave a key blank to use the platform default for that provider.
            </p>
          </div>

          {sorted.map((provider, idx) => (
            <ProviderRow
              key={provider.id}
              provider={provider}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Changes save automatically</p>
          <button
            onClick={closeSettings}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
