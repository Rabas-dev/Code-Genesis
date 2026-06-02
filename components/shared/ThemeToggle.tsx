'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md'
}

// Renders nothing until mounted to avoid server/client theme hydration mismatch.
// next-themes resolvedTheme is undefined on the server → renders one icon;
// on the client it becomes 'dark' or 'light' → different icon → hydration error.
export function ThemeToggle({ className, size = 'sm' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground',
        className
      )}
      title="Toggle theme"
      suppressHydrationWarning
    >
      {/* Render a stable placeholder until mounted, then swap in the correct icon */}
      {!mounted
        ? <Moon className={iconClass} aria-hidden />
        : resolvedTheme === 'dark'
          ? <Sun className={iconClass} />
          : <Moon className={iconClass} />}
    </button>
  )
}
