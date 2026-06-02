# Deploying Code Genesis

## ⚠️ Critical constraint: this is NOT a Vercel app

Code Genesis runs a **custom Node server** (`server.js`) that:
- Spawns real shell processes via `node-pty` (a native C++ addon)
- Runs a **WebSocket server** for the live terminal
- Writes generated projects to disk and runs `npm install` + `next dev` for them

None of that works on **Vercel / Netlify / Cloudflare Pages** — those are serverless
(no persistent processes, no native binaries, no long-lived WebSockets, read-only FS).

You need a platform that gives you a **real container or VM**.

---

## Recommended: Railway (easiest) or Fly.io / Render / a VPS

| Platform | Free tier | node-pty | WebSocket | Notes |
|----------|-----------|----------|-----------|-------|
| **Railway** | $5 credit/mo | ✅ | ✅ | Easiest — push repo, it builds the Dockerfile |
| **Render** | Free web service | ✅ | ✅ | Sleeps after 15 min idle on free tier |
| **Fly.io** | 3 small VMs free | ✅ | ✅ | Best for global edge + persistent volumes |
| **VPS (Hetzner/DO)** | ~$5/mo | ✅ | ✅ | Full control, most work |

---

## Step 1 — Add a Dockerfile

```dockerfile
FROM node:20-bookworm-slim

# node-pty needs build tools + python at install time
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# spawn-helper needs the execute bit (npm strips it)
RUN chmod +x node_modules/node-pty/prebuilds/*/spawn-helper || true

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
```

> The generated-app dev servers run on **port 3001** inside the same container.
> In production you may want to disable the live-terminal feature (it's a dev/demo
> tool) or sandbox each generated project — running untrusted generated code on
> your server is a security risk at scale (see "Hardening" below).

## Step 2 — Environment variables

Set these in your platform's dashboard (never commit them):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # if used server-side
GROQ_API_KEY=...                     # fallback LLM key
GITHUB_CLIENT_ID=...                 # for "Push to GitHub"
GITHUB_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 3 — Supabase (already hosted)

Supabase is already a managed service — nothing to deploy. Just:
1. In Supabase dashboard → Authentication → URL Configuration, add your production
   domain to **Site URL** and **Redirect URLs**.
2. Confirm Row Level Security (RLS) policies are enabled on `projects` and
   `project_files` so users only see their own rows.

## Step 4 — Deploy on Railway (fastest path)

```bash
# 1. Push your code to GitHub
git init && git add . && git commit -m "Deploy Code Genesis"
gh repo create code-genesis --private --source=. --push

# 2. On railway.app: New Project → Deploy from GitHub repo
#    Railway auto-detects the Dockerfile and builds it.

# 3. Add the env vars from Step 2 in Railway → Variables
# 4. Railway gives you a public URL — done.
```

---

## Hardening (before real users)

The live-preview feature runs **generated code on your server**. For a demo/portfolio
this is fine. For production with untrusted users, you must isolate it:

1. **Per-project sandboxing** — run each generated app in its own Docker container
   or a microVM (Firecracker, e.g. via [E2B](https://e2b.dev) or Daytona), not in
   the main process.
2. **Resource limits** — cap CPU/memory/time per generated app.
3. **Network egress rules** — block generated apps from calling internal services.
4. **Move the terminal to a separate worker** so a crash in a generated app can't
   take down Code Genesis itself.

Alternative that removes the server-side risk entirely:
**StackBlitz WebContainers** or **Sandpack** run the generated app *in the user's
browser* (WASM) instead of on your server. Bigger rewrite, but then the whole app
*can* go on Vercel.

---

## TL;DR

- **Demo / portfolio now:** Railway + the Dockerfile above. ~15 minutes.
- **Real product later:** sandbox generated code (E2B / containers) or move preview
  to browser-based WebContainers.
