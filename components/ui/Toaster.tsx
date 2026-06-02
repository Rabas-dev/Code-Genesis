'use client'

import { useToastStore, type ToastVariant } from '@/store/useToastStore'
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ComponentType<{ className?: string }>; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
  error: { icon: AlertCircle, ring: 'border-red-500/30', iconColor: 'text-red-400' },
  info: { icon: Info, ring: 'border-blue-500/30', iconColor: 'text-blue-400' },
  loading: { icon: Loader2, ring: 'border-violet-500/30', iconColor: 'text-violet-400' },
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-[340px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const { icon: Icon, ring, iconColor } = VARIANT_STYLES[t.variant]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-3 pr-2 shadow-2xl shadow-black/40',
              'bg-card/80 backdrop-blur-xl animate-slide-up-fade',
              ring
            )}
            role="status"
          >
            <div className={cn('shrink-0 mt-0.5', iconColor)}>
              <Icon className={cn('w-4 h-4', t.variant === 'loading' && 'animate-spin')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{t.title}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-words">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
