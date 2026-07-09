'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, Moon, Sun, Loader2, Eye, EyeOff, ArrowRight, Sparkles, Zap, ShieldCheck, TerminalSquare } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: Sparkles,
    label: 'AI Generation',
    desc: 'Requirements, architecture, and code — in one pipeline',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: ShieldCheck,
    label: 'Quality Review',
    desc: 'AI scores security, performance, and architecture',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Zap,
    label: 'Auto-Fix',
    desc: 'Self-healing loop detects and patches build errors',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: TerminalSquare,
    label: 'Live Terminal',
    desc: 'Real shell and preview — no local setup required',
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
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(friendlyError(error.message))
        setLoading(false)
        return
      }

      // Sign-up with email confirmation OFF returns a session → log in immediately.
      // If no session came back, confirmation is still enabled in Supabase: sign in directly.
      if (isSignUp && !data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setMessage('Account created. Disable “Confirm email” in Supabase to sign in instantly.')
          setIsSignUp(false)
          setLoading(false)
          return
        }
      }

      router.push('/dashboard')
      router.refresh()
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
            <h1 className="text-[2.6rem] font-black text-white leading-[1.15] tracking-tight" style={{textWrap: 'balance'}}>
              From idea to
              <br />
              <span className="text-violet-400">
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
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-lg text-foreground">
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
                ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-600/25'
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
