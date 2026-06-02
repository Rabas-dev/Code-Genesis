'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, Building2, Moon, Sun, Loader2, Eye, EyeOff, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: Sparkles,
    label: 'AI Code Generation',
    desc: 'Prompt → full-stack app in seconds',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Shield,
    label: 'Code Judge',
    desc: 'Senior AI reviews quality, security & perf',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Building2,
    label: 'AI Architect',
    desc: 'System diagrams, DB schemas & API contracts',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Zap,
    label: 'Live Terminal',
    desc: 'Run your app right inside the browser',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
]

function friendlyError(msg: string): string {
  if (!msg) return 'Something went wrong. Please try again.'
  const m = msg.toLowerCase()
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch'))
    return 'Cannot reach the server. Check your internet connection and try again.'
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong'))
    return 'Incorrect email or password.'
  if (m.includes('email not confirmed'))
    return 'Please confirm your email before signing in.'
  if (m.includes('user already registered'))
    return 'An account with this email already exists. Sign in instead.'
  if (m.includes('password'))
    return 'Password must be at least 6 characters.'
  if (m.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.'
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const supabase = useRef(createClient()).current

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [activeField, setActiveField] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(friendlyError(error.message))
        setLoading(false)
        return
      }

      if (isSignUp) {
        setMessage('Check your email to confirm your account, then sign in.')
        setIsSignUp(false)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(friendlyError(msg))
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) {
        setError(friendlyError(error.message))
        setLoading(false)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(friendlyError(msg))
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsSignUp((v) => !v)
    setError(null)
    setMessage(null)
    setPassword('')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br from-[#0d0d1a] via-[#13103a] to-[#0d0d1a] p-14 relative overflow-hidden select-none">
        {/* Ambient blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-800/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Dot-grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, #6d28d9 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black text-white tracking-tight">Code Genesis</span>
        </div>

        {/* Hero text + features */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-medium">
              <Sparkles className="w-3 h-3" />
              AI-Powered Browser IDE
            </div>
            <h1 className="text-[2.6rem] font-black text-white leading-[1.15] tracking-tight">
              From idea to
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                running app.
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Code Genesis walks you through the full SDLC — requirements, architecture, generation, and live preview — all in one browser tab.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc, color, bg }) => (
              <div
                key={label}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm hover:bg-white/[0.06] transition-colors"
              >
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', bg)}>
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-slate-700 font-medium">
          © 2026 Code Genesis · FYP Project
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="absolute top-6 right-6 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Wand2 className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Code Genesis
          </span>
        </div>

        <div className="w-full max-w-[360px] space-y-7">
          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? 'Start building with AI in seconds'
                : 'Sign in to continue to your workspace'}
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/60 active:scale-[0.99] transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {/* Email */}
            <div className="relative">
              <label
                className={cn(
                  'absolute left-3.5 transition-all duration-150 pointer-events-none text-muted-foreground',
                  (activeField === 'email' || email)
                    ? 'top-1.5 text-[10px] font-medium text-violet-400'
                    : 'top-1/2 -translate-y-1/2 text-sm'
                )}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setActiveField('email')}
                onBlur={() => setActiveField(null)}
                className={cn(
                  'w-full rounded-xl border bg-muted/30 px-3.5 pt-5 pb-2 text-sm focus:outline-none transition-all',
                  activeField === 'email'
                    ? 'border-violet-500/60 ring-2 ring-violet-500/20'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <label
                className={cn(
                  'absolute left-3.5 transition-all duration-150 pointer-events-none text-muted-foreground',
                  (activeField === 'password' || password)
                    ? 'top-1.5 text-[10px] font-medium text-violet-400'
                    : 'top-1/2 -translate-y-1/2 text-sm'
                )}
              >
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setActiveField('password')}
                onBlur={() => setActiveField(null)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                className={cn(
                  'w-full rounded-xl border bg-muted/30 px-3.5 pt-5 pb-2 pr-10 text-sm focus:outline-none transition-all',
                  activeField === 'password'
                    ? 'border-violet-500/60 ring-2 ring-violet-500/20'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-400">
              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-400">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold">✓</span>
              </div>
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleEmailAuth}
            disabled={loading || !email.trim() || !password.trim()}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.99]',
              email.trim() && password.trim() && !loading
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/25'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Toggle mode */}
          <p className="text-center text-xs text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={switchMode}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors hover:underline underline-offset-2"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
