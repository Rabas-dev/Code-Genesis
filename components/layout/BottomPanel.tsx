'use client'

import { useIDEStore } from '@/store/useIDEStore'
import { fakeLogs, fakeTestResults } from '@/lib/fakeData'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Check, X, Terminal, ChevronDown } from 'lucide-react'

const TABS = ['logs', 'tests', 'console'] as const

export function BottomPanel() {
  const { bottomPanelTab, setBottomPanelTab, toggleBottomPanel } = useIDEStore()

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-3 border-b border-border shrink-0 h-8 bg-muted/20">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setBottomPanelTab(tab)}
            className={cn(
              'px-3 py-1 text-xs capitalize font-medium rounded-sm transition-colors',
              bottomPanelTab === tab
                ? 'text-foreground bg-background border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={toggleBottomPanel}
          className="ml-auto p-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {bottomPanelTab === 'logs' && (
          <div className="p-2 space-y-0.5 font-mono text-xs">
            {fakeLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5 hover:bg-muted/30 rounded px-1">
                <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
                <span
                  className={cn(
                    'px-1.5 py-0 rounded text-[10px] font-bold shrink-0',
                    log.level === 'INFO' ? 'bg-emerald-500/15 text-emerald-400' :
                    log.level === 'WARN' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-red-500/15 text-red-400'
                  )}
                >
                  {log.level}
                </span>
                <span className="text-foreground/80">{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {bottomPanelTab === 'tests' && (
          <div className="p-3 space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <span className="font-medium">5</span>
                <span className="text-muted-foreground text-xs">passed</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-red-400" />
                </span>
                <span className="font-medium">1</span>
                <span className="text-muted-foreground text-xs">failed</span>
              </div>
            </div>
            <div className="space-y-1">
              {fakeTestResults.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/30">
                  {t.status === 'pass' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span className={t.status === 'fail' ? 'text-red-400' : 'text-foreground/80'}>{t.name}</span>
                  <span className="ml-auto text-muted-foreground">{t.duration}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {bottomPanelTab === 'console' && (
          <div className="p-3 font-mono text-xs space-y-1 bg-zinc-950 h-full text-green-400">
            <p className="text-zinc-500">$ npm run dev</p>
            <p className="text-blue-400">▲ Next.js 14.2.0</p>
            <p className="text-zinc-400">- Local:        http://localhost:3000</p>
            <p className="text-zinc-400">- Environments: .env.local</p>
            <p className="text-zinc-500">✓ Starting...</p>
            <p className="text-green-400">✓ Ready in 1.8s</p>
            <p className="text-zinc-400"> GET / 200 in 45ms</p>
            <p className="text-zinc-400"> GET /dashboard 200 in 12ms</p>
            <p className="text-zinc-400"> GET /api/metrics 200 in 67ms</p>
            <p className="text-amber-400">warn  - Prisma Client is used in browser environment</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
