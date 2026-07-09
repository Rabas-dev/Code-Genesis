const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

// ── Fix node-pty spawn-helper permissions on every startup ───────────────────
// npm install resets the execute bit on prebuilt binaries; this ensures it's
// always set before node-pty is loaded, preventing "posix_spawnp failed".
;(function fixPtyPermissions() {
  const prebuilds = path.join(__dirname, 'node_modules', 'node-pty', 'prebuilds')
  if (!fs.existsSync(prebuilds)) return
  for (const dir of fs.readdirSync(prebuilds)) {
    const helper = path.join(prebuilds, dir, 'spawn-helper')
    if (fs.existsSync(helper)) {
      try { fs.chmodSync(helper, 0o755) } catch {}
    }
  }
})()

const pty = require('node-pty')

const PORT = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'

// ── Template: pre-installed node_modules ────────────────────────────────────
const TEMPLATE_DIR = path.join(os.homedir(), '.code-genesis', 'template')
const TEMPLATE_MODULES = path.join(TEMPLATE_DIR, 'node_modules')

function initTemplate() {
  if (fs.existsSync(path.join(TEMPLATE_MODULES, '.bin', 'next'))) {
    console.log('> [Code Genesis] Template ready — fast project startup enabled')
    return
  }
  console.log('> [Code Genesis] First-run template install (one time, ~2 min)…')
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true })
  const pkg = {
    name: 'code-genesis-template', version: '0.1.0', private: true,
    scripts: { dev: 'next dev -p 3001', build: 'next build', start: 'next start -p 3001' },
    dependencies: { next: '14.2.5', react: '^18', 'react-dom': '^18', typescript: '^5' },
    devDependencies: {
      '@types/node': '^20', '@types/react': '^18', '@types/react-dom': '^18',
      tailwindcss: '^3', postcss: '^8', autoprefixer: '^10',
    },
  }
  fs.writeFileSync(path.join(TEMPLATE_DIR, 'package.json'), JSON.stringify(pkg, null, 2))
  try {
    execSync('npm install --prefer-offline --legacy-peer-deps', {
      cwd: TEMPLATE_DIR, stdio: 'inherit', timeout: 300000,
    })
    console.log('> [Code Genesis] Template ready')
  } catch (e) {
    console.error('> [Code Genesis] Template install failed:', e.message)
  }
}
setImmediate(initTemplate)

// ── Helpers ──────────────────────────────────────────────────────────────────
function getProjectDir(projectId) {
  return path.join(os.tmpdir(), 'code-genesis', projectId)
}

function detectPort(data) {
  const patterns = [
    /- Local:\s+https?:\/\/localhost:(\d{4,5})/,
    /Local:\s+https?:\/\/localhost:(\d{4,5})/,
    /ready[- ].*?on\s+(?:0\.0\.0\.0:)?(\d{4,5})/i,
    /http:\/\/localhost:(\d{4,5})/,
  ]
  for (const re of patterns) {
    const m = data.match(re)
    if (m) return parseInt(m[1], 10)
  }
  return null
}

// Write a self-contained startup shell script into the project directory.
// Using a file avoids all quote/escaping issues with one-liner PTY writes.
function writeStartScript(projectDir) {
  const projectModules = path.join(projectDir, 'node_modules')
  const templateReady = fs.existsSync(path.join(TEMPLATE_MODULES, '.bin', 'next'))

  const lines = [
    '#!/bin/sh',
    'cd "$(dirname "$0")"',
    'echo ""',
    'echo "  \\033[1;35m▶ Code Genesis\\033[0m  starting project..."',
    'echo ""',
    // Free port 3001 if a previous (orphaned) dev server is still holding it
    'PORT_PID=$(lsof -ti:3001 2>/dev/null)',
    'if [ -n "$PORT_PID" ]; then',
    '  echo "  \\033[33m♻\\033[0m Freeing port 3001 (killing stale process)..."',
    '  kill -9 $PORT_PID 2>/dev/null',
    '  sleep 1',
    'fi',
    // Step 1: ensure node_modules exist (symlink for instant base packages)
    `if [ -e "${projectModules}" ]; then`,
    '  echo "  \\033[32m✓\\033[0m Base modules ready"',
    `elif [ -d "${TEMPLATE_MODULES}/.bin" ]; then`,
    '  echo "  \\033[33m⚡\\033[0m Linking cached modules..."',
    `  ln -s "${TEMPLATE_MODULES}" "${projectModules}"`,
    '  echo "  \\033[32m✓\\033[0m Modules linked"',
    'else',
    '  echo "  \\033[33m📦\\033[0m Installing base dependencies..."',
    '  npm install --prefer-offline --legacy-peer-deps',
    'fi',
    // Step 2: install any extra packages the generated app needs (fast from cache)
    'echo "  \\033[33m📦\\033[0m Checking for extra dependencies..."',
    'npm install --prefer-offline --legacy-peer-deps --silent 2>&1 | tail -3',
    'echo "  \\033[32m✓\\033[0m All dependencies ready"',
    'echo ""',
    'echo "  \\033[34m🚀\\033[0m Starting Next.js on port 3001..."',
    'echo ""',
    // Cap the generated dev server's heap so it can't balloon during a recompile
    // and push total memory past what macOS allows (which SIGKILLs Code Genesis).
    'export NODE_OPTIONS="--max-old-space-size=1024"',
    'exec npm run dev',
  ]
  const scriptPath = path.join(projectDir, '_genesis_start.sh')
  fs.writeFileSync(scriptPath, lines.join('\n'), { encoding: 'utf8', mode: 0o755 })
  return scriptPath
}

// ── Session manager ─────────────────────────────────────────────────────────
const sessions = new Map()

function broadcast(session, data) {
  const msg = JSON.stringify(data)
  for (const client of session.clients) {
    if (client.readyState === 1) client.send(msg)
  }
}

// Kill the PTY shell AND any orphaned dev server holding port 3001.
// node-pty's kill() only kills the immediate shell — the `next dev` child
// survives and keeps the port bound, causing EADDRINUSE on the next run.
function killSession(ptyProcess) {
  try { ptyProcess.kill() } catch {}
  // Free port 3001 in case a child dev server is still bound to it
  try {
    execSync("lsof -ti:3001 | xargs kill -9 2>/dev/null", { stdio: 'ignore', timeout: 3000 })
  } catch { /* nothing on the port — fine */ }
}

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = createServer()
const app = next({ dev, httpServer: server })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  server.on('request', (req, res) => {
    handle(req, res, parse(req.url, true))
  })

  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url, true)
    if (pathname === '/terminal') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, query)
      })
    }
  })

  const MAX_BUFFER = 200_000 // ~200 KB of scrollback kept server-side for replay

  wss.on('connection', (ws, req, query) => {
    const projectId = String(query.projectId || 'default')
    const autorun = query.autorun === '1'
    const projectDir = getProjectDir(projectId)
    fs.mkdirSync(projectDir, { recursive: true })

    // ── Reuse existing session ────────────────────────────────────────────────
    // A reconnect happens on tab switches AND React StrictMode double-mounts.
    // Replay the buffered output so the new xterm shows full history (and Copy
    // captures everything). Only start a fresh shell when there is no session.
    if (sessions.has(projectId)) {
      const existing = sessions.get(projectId)

      // Cancel any pending cleanup — a client came back
      if (existing.killTimer) { clearTimeout(existing.killTimer); existing.killTimer = null }

      existing.clients.add(ws)

      // Replay scrollback so history + Copy work after a remount
      if (existing.buffer) {
        ws.send(JSON.stringify({ type: 'output', data: existing.buffer }))
      }

      // If autorun was requested but the shell is already running the project,
      // don't run it again (prevents the duplicate `npm run dev`).
      if (autorun && !existing.started) {
        existing.started = true
        setTimeout(() => {
          try {
            const scriptPath = writeStartScript(projectDir)
            existing.ptyProcess.write(`sh "${scriptPath}"\r`)
          } catch (e) {
            broadcast(existing, { type: 'output', data: `\r\n\x1b[31mError: ${e.message}\x1b[0m\r\n` })
          }
        }, 300)
      }

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString())
          if (msg.type === 'input') existing.ptyProcess.write(msg.data)
          if (msg.type === 'resize') existing.ptyProcess.resize(Math.max(1, msg.cols || 80), Math.max(1, msg.rows || 24))
        } catch { existing.ptyProcess.write(raw.toString()) }
      })
      ws.on('close', () => scheduleCleanup(projectId, existing, ws))
      return
    }

    // ── New session ───────────────────────────────────────────────────────────
    const shell = process.env.SHELL || '/bin/zsh'
    let ptyProcess
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 120,
        rows: 30,
        cwd: projectDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1',
          PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ''}`,
        },
      })
    } catch (spawnErr) {
      console.error('[terminal] PTY spawn failed:', spawnErr.message)
      ws.send(JSON.stringify({ type: 'output', data: `\r\n\x1b[31mFailed to start terminal: ${spawnErr.message}\x1b[0m\r\n\x1b[33mTry restarting the server with: npm run dev\x1b[0m\r\n` }))
      ws.close()
      return
    }

    const session = { ptyProcess, clients: new Set([ws]), buffer: '', started: false, killTimer: null }
    sessions.set(projectId, session)

    ptyProcess.onData((data) => {
      // Append to the replay buffer (capped)
      session.buffer += data
      if (session.buffer.length > MAX_BUFFER) {
        session.buffer = session.buffer.slice(session.buffer.length - MAX_BUFFER)
      }
      broadcast(session, { type: 'output', data })
      const p = detectPort(data)
      if (p && p !== PORT) broadcast(session, { type: 'port', port: p })
    })

    ptyProcess.onExit(({ exitCode }) => {
      broadcast(session, { type: 'output', data: `\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n` })
      sessions.delete(projectId)
    })

    if (autorun) {
      session.started = true
      setTimeout(() => {
        try {
          const scriptPath = writeStartScript(projectDir)
          ptyProcess.write(`sh "${scriptPath}"\r`)
        } catch (e) {
          broadcast(session, { type: 'output', data: `\r\n\x1b[31mError: ${e.message}\x1b[0m\r\n` })
        }
      }, 800)
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'input') ptyProcess.write(msg.data)
        if (msg.type === 'resize') ptyProcess.resize(Math.max(1, msg.cols || 80), Math.max(1, msg.rows || 24))
      } catch { ptyProcess.write(raw.toString()) }
    })

    ws.on('close', () => scheduleCleanup(projectId, session, ws))
  })

  // Delay killing the shell when the last client disconnects. A React
  // StrictMode remount (or quick tab switch) reconnects within ~1s, and we
  // want it to reattach to the SAME shell instead of spawning a new one
  // (which caused the duplicate `npm run dev`).
  function scheduleCleanup(projectId, session, ws) {
    session.clients.delete(ws)
    if (session.clients.size > 0) return
    if (session.killTimer) clearTimeout(session.killTimer)
    session.killTimer = setTimeout(() => {
      if (session.clients.size === 0) {
        killSession(session.ptyProcess)
        sessions.delete(projectId)
      }
    }, 4000)
  }

  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`)
  })
})
