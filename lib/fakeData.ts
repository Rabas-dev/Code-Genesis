import type {
  Project,
  CodeAnalysis,
  ArchitectureOutput,
  HealingStep,
  FileTreeNode,
  LogEntry,
  TestResult,
} from '@/types'

// ─── Fake Projects ──────────────────────────────────────────────────────────

export const fakeProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'SaaS Dashboard',
    prompt: 'Build a modern SaaS analytics dashboard with user management, billing integration via Stripe, real-time charts using Chart.js, and role-based access control.',
    status: 'complete',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    files: [
      {
        id: 'f1',
        path: 'app/page.tsx',
        language: 'typescript',
        content: `import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  redirect('/dashboard')
}`,
      },
      {
        id: 'f2',
        path: 'app/dashboard/page.tsx',
        language: 'typescript',
        content: `'use client'

import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/MetricCard'
import { RevenueChart } from '@/components/RevenueChart'
import { UserTable } from '@/components/UserTable'
import { useAnalytics } from '@/hooks/useAnalytics'

export default function DashboardPage() {
  const { metrics, loading } = useAnalytics()

  if (loading) return <div className="animate-pulse">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Analytics Overview</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="MRR" value={\`$\${metrics.mrr.toLocaleString()}\`} change={+12.5} />
        <MetricCard title="Active Users" value={metrics.activeUsers} change={+5.2} />
        <MetricCard title="Churn Rate" value={\`\${metrics.churn}%\`} change={-1.3} />
        <MetricCard title="NPS Score" value={metrics.nps} change={+8} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <RevenueChart data={metrics.revenueHistory} />
        </div>
        <UserTable users={metrics.recentUsers} />
      </div>
    </div>
  )
}`,
      },
      {
        id: 'f3',
        path: 'components/Header.tsx',
        language: 'typescript',
        content: `'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Users, CreditCard, 
  Settings, Bell, Search, LogOut 
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="h-16 border-b bg-background flex items-center px-6 gap-4">
      <Link href="/dashboard" className="font-bold text-xl text-primary">
        Acme Analytics
      </Link>
      
      <nav className="flex items-center gap-1 ml-6">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Search className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer w-8 h-8">
              <AvatarImage src="/avatar.jpg" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}`,
      },
      {
        id: 'f4',
        path: 'lib/db.ts',
        language: 'typescript',
        content: `import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// ─── Query Helpers ─────────────────────────────────────────────────
export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      organization: true,
    },
  })
}

export async function getOrganizationMetrics(orgId: string) {
  const [mrr, activeUsers, churnedUsers] = await Promise.all([
    db.subscription.aggregate({
      where: { organizationId: orgId, status: 'active' },
      _sum: { amount: true },
    }),
    db.user.count({
      where: { organizationId: orgId, lastActiveAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
    db.user.count({
      where: { organizationId: orgId, status: 'churned' },
    }),
  ])

  return {
    mrr: mrr._sum.amount ?? 0,
    activeUsers,
    churnRate: activeUsers > 0 ? (churnedUsers / activeUsers) * 100 : 0,
  }
}`,
      },
      {
        id: 'f5',
        path: 'lib/auth.ts',
        language: 'typescript',
        content: `import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role ?? 'user'
      }
      return token
    },
  },
}`,
      },
    ],
  },
  {
    id: 'proj-002',
    name: 'E-Commerce Platform',
    prompt: 'Build a full-stack e-commerce platform with product listings, shopping cart, Stripe payments, inventory management, and an admin panel.',
    status: 'generating',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    files: [],
  },
  {
    id: 'proj-003',
    name: 'Real-Time Chat App',
    prompt: 'Create a real-time chat application with WebSocket support, multiple rooms, user presence indicators, file attachments, and end-to-end encryption.',
    status: 'complete',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    files: [
      {
        id: 'f10',
        path: 'app/page.tsx',
        language: 'typescript',
        content: `import { ChatLayout } from '@/components/ChatLayout'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  
  return <ChatLayout userId={session.user.id} />
}`,
      },
      {
        id: 'f11',
        path: 'components/ChatWindow.tsx',
        language: 'typescript',
        content: `'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Message } from '@/types'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'

interface ChatWindowProps {
  roomId: string
  userId: string
}

export function ChatWindow({ roomId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { userId },
    })

    s.emit('join-room', roomId)
    
    s.on('message', (msg: Message) => {
      setMessages(prev => [...prev, msg])
    })

    s.on('history', (history: Message[]) => {
      setMessages(history)
    })

    setSocket(s)
    return () => { s.disconnect() }
  }, [roomId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (content: string) => {
    socket?.emit('send-message', { roomId, content, userId })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isOwn={msg.userId === userId} 
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  )
}`,
      },
      {
        id: 'f12',
        path: 'lib/db.ts',
        language: 'typescript',
        content: `import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getRoomMessages(roomId: string, limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, user:users(name, avatar_url)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data.reverse()
}

export async function saveMessage(payload: {
  roomId: string
  userId: string
  content: string
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: payload.roomId,
      user_id: payload.userId,
      content: payload.content,
    })
    .select()
    .single()

  if (error) throw error
  return data
}`,
      },
    ],
  },
]

// ─── Fake Code Analysis ──────────────────────────────────────────────────────

export const fakeCodeAnalysis: CodeAnalysis = {
  overallScore: 74,
  securityScore: 58,
  performanceScore: 80,
  qualityScore: 85,
  architectureScore: 71,
  seniorVerdict: 'maybe',
  summary:
    'The codebase shows solid architecture and good code quality practices. However, there are critical security vulnerabilities that must be addressed before production deployment, particularly around SQL injection and missing input validation.',
  issues: [
    {
      id: 'sec-001',
      severity: 'critical',
      category: 'security',
      description: 'Raw SQL query with user input — SQL injection vulnerability detected in getUserById()',
      line: 23,
      fix: 'Use parameterized queries or an ORM like Prisma instead of raw string interpolation.\n\n// ❌ Vulnerable\nconst user = await db.query(`SELECT * FROM users WHERE id = ${userId}`)\n\n// ✅ Safe\nconst user = await db.user.findUnique({ where: { id: userId } })',
    },
    {
      id: 'sec-002',
      severity: 'critical',
      category: 'security',
      description: 'API route missing authentication middleware — /api/admin endpoints are publicly accessible',
      line: 7,
      fix: 'Add middleware.ts to protect /api/admin routes:\n\nexport { default } from "next-auth/middleware"\nexport const config = { matcher: ["/api/admin/:path*"] }',
    },
    {
      id: 'perf-001',
      severity: 'warning',
      category: 'performance',
      description: 'N+1 query pattern in UserTable — fetching subscription data inside a loop instead of using JOIN',
      line: 45,
    },
    {
      id: 'qual-001',
      severity: 'info',
      category: 'quality',
      description: 'Missing error boundaries — React components lack error handling for async operations',
    },
    {
      id: 'qual-002',
      severity: 'info',
      category: 'quality',
      description: '7 TODO comments left in production code — technical debt markers should be converted to issues',
    },
  ],
}

// ─── Fake Architecture (Uber Clone) ─────────────────────────────────────────

export const fakeArchitectureOutput: ArchitectureOutput = {
  mermaidDiagram: `graph TD
    Client["📱 Mobile/Web Client"]
    Gateway["🌐 API Gateway\\n(nginx + rate limiting)"]
    Auth["🔐 Auth Service\\n(JWT + OAuth2)"]
    Ride["🚗 Ride Service\\n(booking + matching)"]
    Driver["👤 Driver Service\\n(availability + tracking)"]
    Payment["💳 Payment Service\\n(Stripe)"]
    Notification["🔔 Notification Service\\n(FCM + APNS)"]
    Maps["🗺️ Maps Service\\n(Google Maps API)"]
    Redis["⚡ Redis\\n(sessions + cache)"]
    PG[("🐘 PostgreSQL\\n(primary data)")]
    Queue["📨 Message Queue\\n(RabbitMQ)"]

    Client --> Gateway
    Gateway --> Auth
    Gateway --> Ride
    Gateway --> Driver
    Gateway --> Payment
    Ride --> Maps
    Ride --> Queue
    Queue --> Notification
    Queue --> Driver
    Auth --> Redis
    Ride --> PG
    Driver --> PG
    Payment --> PG`,
  dbTables: [
    {
      name: 'users',
      fields: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'phone', type: 'VARCHAR(20)', nullable: false },
        { name: 'full_name', type: 'VARCHAR(100)', nullable: false },
        { name: 'avatar_url', type: 'TEXT', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false },
      ],
    },
    {
      name: 'rides',
      fields: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'rider_id', type: 'UUID', isForeign: true, nullable: false },
        { name: 'driver_id', type: 'UUID', isForeign: true, nullable: true },
        { name: 'status', type: 'ENUM', nullable: false },
        { name: 'pickup_lat', type: 'DECIMAL(9,6)', nullable: false },
        { name: 'pickup_lng', type: 'DECIMAL(9,6)', nullable: false },
        { name: 'dropoff_lat', type: 'DECIMAL(9,6)', nullable: false },
        { name: 'dropoff_lng', type: 'DECIMAL(9,6)', nullable: false },
        { name: 'fare', type: 'DECIMAL(10,2)', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false },
      ],
    },
    {
      name: 'drivers',
      fields: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'user_id', type: 'UUID', isForeign: true, nullable: false },
        { name: 'vehicle_plate', type: 'VARCHAR(20)', nullable: false },
        { name: 'vehicle_model', type: 'VARCHAR(100)', nullable: false },
        { name: 'is_available', type: 'BOOLEAN', nullable: false },
        { name: 'current_lat', type: 'DECIMAL(9,6)', nullable: true },
        { name: 'current_lng', type: 'DECIMAL(9,6)', nullable: true },
        { name: 'rating', type: 'DECIMAL(3,2)', nullable: true },
      ],
    },
    {
      name: 'payments',
      fields: [
        { name: 'id', type: 'UUID', isPrimary: true },
        { name: 'ride_id', type: 'UUID', isForeign: true, nullable: false },
        { name: 'user_id', type: 'UUID', isForeign: true, nullable: false },
        { name: 'stripe_payment_id', type: 'VARCHAR(255)', nullable: false },
        { name: 'amount', type: 'DECIMAL(10,2)', nullable: false },
        { name: 'currency', type: 'CHAR(3)', nullable: false },
        { name: 'status', type: 'ENUM', nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false },
      ],
    },
  ],
  apiEndpoints: [
    {
      method: 'POST',
      route: '/api/auth/login',
      description: 'Authenticate user with email/password or OAuth provider',
      requestBody: '{\n  "email": "user@example.com",\n  "password": "••••••••"\n}',
      responseExample: '{\n  "accessToken": "eyJhbG...",\n  "refreshToken": "eyJhbG...",\n  "user": { "id": "uuid", "email": "..." }\n}',
    },
    {
      method: 'POST',
      route: '/api/rides/request',
      description: 'Request a new ride from pickup to dropoff location',
      requestBody: '{\n  "pickupLat": 37.7749,\n  "pickupLng": -122.4194,\n  "dropoffLat": 37.8044,\n  "dropoffLng": -122.2712\n}',
      responseExample: '{\n  "rideId": "uuid",\n  "estimatedFare": 18.50,\n  "estimatedArrival": "4 min"\n}',
    },
    {
      method: 'GET',
      route: '/api/rides/:id/status',
      description: 'Poll the current status and driver location of an active ride',
      responseExample: '{\n  "status": "en_route",\n  "driver": { "name": "Alex", "lat": 37.77, "lng": -122.41 },\n  "eta": "2 min"\n}',
    },
    {
      method: 'GET',
      route: '/api/drivers/nearby',
      description: 'Get list of available drivers within radius of a coordinate',
      responseExample: '{\n  "drivers": [\n    { "id": "uuid", "lat": 37.775, "lng": -122.418, "eta": "3 min" }\n  ]\n}',
    },
    {
      method: 'POST',
      route: '/api/payments/charge',
      description: 'Create a Stripe payment intent and charge for completed ride',
      requestBody: '{\n  "rideId": "uuid",\n  "paymentMethodId": "pm_..."\n}',
      responseExample: '{\n  "paymentId": "uuid",\n  "status": "succeeded",\n  "amount": 18.50\n}',
    },
    {
      method: 'DELETE',
      route: '/api/rides/:id/cancel',
      description: 'Cancel an active ride request before driver assignment',
      responseExample: '{\n  "success": true,\n  "cancellationFee": 0\n}',
    },
  ],
  microservices: [
    'Auth Service (Node.js + Passport.js)',
    'Ride Matching Service (Go + WebSockets)',
    'Driver Tracking Service (Go + Redis)',
    'Payment Service (Node.js + Stripe SDK)',
    'Notification Service (Node.js + FCM)',
    'Maps & Routing Service (Python + Google Maps)',
  ],
}

// ─── Fake Healing Steps ──────────────────────────────────────────────────────

export const fakeHealingSteps: HealingStep[] = [
  { step: 'run', label: 'Run Code', status: 'complete' },
  { step: 'detect', label: 'Detect Error', status: 'complete' },
  { step: 'analyze', label: 'Analyze Root Cause', status: 'active' },
  { step: 'fix', label: 'Apply Fix', status: 'pending' },
  { step: 'rerun', label: 'Re-Run Tests', status: 'pending' },
]

// ─── Fake File Tree ──────────────────────────────────────────────────────────

export const fakeFileTree: FileTreeNode[] = [
  {
    name: 'app',
    type: 'folder',
    children: [
      { name: 'page.tsx', type: 'file', language: 'typescript' },
      { name: 'layout.tsx', type: 'file', language: 'typescript' },
      { name: 'globals.css', type: 'file', language: 'css' },
      {
        name: 'dashboard',
        type: 'folder',
        children: [
          { name: 'page.tsx', type: 'file', language: 'typescript' },
        ],
      },
      {
        name: 'api',
        type: 'folder',
        children: [
          {
            name: 'auth',
            type: 'folder',
            children: [
              { name: 'route.ts', type: 'file', language: 'typescript' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'components',
    type: 'folder',
    children: [
      { name: 'Header.tsx', type: 'file', language: 'typescript' },
      { name: 'MetricCard.tsx', type: 'file', language: 'typescript' },
      { name: 'RevenueChart.tsx', type: 'file', language: 'typescript' },
      { name: 'UserTable.tsx', type: 'file', language: 'typescript' },
    ],
  },
  {
    name: 'lib',
    type: 'folder',
    children: [
      { name: 'db.ts', type: 'file', language: 'typescript' },
      { name: 'auth.ts', type: 'file', language: 'typescript' },
      { name: 'utils.ts', type: 'file', language: 'typescript' },
    ],
  },
  {
    name: 'public',
    type: 'folder',
    children: [
      { name: 'logo.svg', type: 'file', language: 'svg' },
      { name: 'favicon.ico', type: 'file', language: 'ico' },
    ],
  },
  { name: 'package.json', type: 'file', language: 'json' },
  { name: 'tsconfig.json', type: 'file', language: 'json' },
  { name: 'tailwind.config.ts', type: 'file', language: 'typescript' },
  { name: 'README.md', type: 'file', language: 'markdown' },
]

// ─── Fake Log Entries ────────────────────────────────────────────────────────

export const fakeLogs: LogEntry[] = [
  { timestamp: '22:14:01', level: 'INFO', message: 'Starting Code Genesis project generation engine...' },
  { timestamp: '22:14:01', level: 'INFO', message: 'Prompt received: "Build a SaaS analytics dashboard"' },
  { timestamp: '22:14:02', level: 'INFO', message: 'Intent parsed successfully — detected: SaaS, analytics, auth, billing' },
  { timestamp: '22:14:02', level: 'INFO', message: 'Architecture planning complete — 8 files selected for generation' },
  { timestamp: '22:14:03', level: 'INFO', message: 'File tree created: app/, components/, lib/, public/' },
  { timestamp: '22:14:03', level: 'INFO', message: 'Generating app/page.tsx (1/8)...' },
  { timestamp: '22:14:04', level: 'INFO', message: 'Generating app/dashboard/page.tsx (2/8)...' },
  { timestamp: '22:14:04', level: 'INFO', message: 'Generating components/Header.tsx (3/8)...' },
  { timestamp: '22:14:05', level: 'INFO', message: 'Generating lib/db.ts (4/8) — detected Prisma pattern' },
  { timestamp: '22:14:06', level: 'WARN', message: 'lib/auth.ts requires GOOGLE_CLIENT_ID env var (5/8)' },
  { timestamp: '22:14:06', level: 'INFO', message: 'Generating components/MetricCard.tsx (6/8)...' },
  { timestamp: '22:14:07', level: 'INFO', message: 'Generating components/RevenueChart.tsx (7/8)...' },
  { timestamp: '22:14:08', level: 'INFO', message: 'Running post-generation validation (8/8)...' },
  { timestamp: '22:14:09', level: 'INFO', message: 'TypeScript type check: ✓ No errors found' },
  { timestamp: '22:14:09', level: 'INFO', message: 'ESLint scan: ✓ 0 errors, 2 warnings' },
  { timestamp: '22:14:10', level: 'INFO', message: '🎉 Project generation complete! 8 files generated in 9.2s' },
]

// ─── Fake Test Results ───────────────────────────────────────────────────────

export const fakeTestResults: TestResult[] = [
  { name: 'renders DashboardPage without crashing', status: 'pass', duration: 42 },
  { name: 'MetricCard shows correct value and change percentage', status: 'pass', duration: 18 },
  { name: 'Header displays active nav item correctly', status: 'pass', duration: 31 },
  { name: 'getUserById returns user with subscription data', status: 'pass', duration: 67 },
  { name: 'getOrganizationMetrics calculates MRR correctly', status: 'pass', duration: 55 },
  { name: 'RevenueChart renders chart with data points', status: 'fail', duration: 23 },
]

// ─── Fake Broken / Fixed Code (Debugger) ─────────────────────────────────────

export const fakeBrokenCode = `import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  // ⚠️ No input validation
  // ⚠️ Raw SQL — SQL injection risk
  const user = await db.$queryRaw(
    \`SELECT * FROM users WHERE id = '\${userId}'\`
  )

  // ⚠️ Exposing sensitive fields
  return NextResponse.json(user)
}

// ⚠️ Missing try/catch — unhandled promise rejection`

export const fakeFixedCode = `import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const QuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const { userId } = QuerySchema.parse({
      userId: searchParams.get('userId'),
    })

    // ✅ Parameterized query via Prisma ORM
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        // ✅ Sensitive fields excluded
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    // ✅ Proper error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}`

export const fakeRootCause = {
  title: 'SQL Injection via Unparameterized Raw Query',
  explanation:
    'The API route directly interpolates user-supplied input (userId) into a raw SQL string using template literals. This allows an attacker to inject arbitrary SQL by crafting a malicious userId value (e.g., \' OR 1=1 --), potentially exposing or destroying the entire database. Additionally, no input validation or error handling was present.',
  confidence: 94,
}

// ─── SDLC Steps ──────────────────────────────────────────────────────────────

export const sdlcSteps = [
  { id: 0, label: 'Requirements', description: 'Analyzing prompt & intent', icon: '🔍' },
  { id: 1, label: 'Architecture', description: 'Designing system structure', icon: '🏗️' },
  { id: 2, label: 'Implementation', description: 'Generating source files', icon: '⚙️' },
  { id: 3, label: 'Testing', description: 'Validating & linting code', icon: '🧪' },
  { id: 4, label: 'Deploy Ready', description: 'Project is production-ready', icon: '🚀' },
]
