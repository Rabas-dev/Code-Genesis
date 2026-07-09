# Code Genesis

Code Genesis turns a single prompt into a complete, reviewed Next.js / TypeScript project — from requirements to running code — without leaving the browser.

It runs the prompt through a staged AI pipeline (requirements → architecture → wireframe → code generation) and delivers the result into an integrated in-browser IDE: Monaco editor, live preview, a real terminal (node-pty), AI quality review, auto-fix self-healing, automated browser testing, GitHub push, and document export.

## Features

- **Staged generation pipeline** — requirements, architecture doc, wireframe (TLDraw canvas), and code generation as distinct, inspectable stages (`lib/ai/stages/`)
- **In-browser IDE** — Monaco editor, live preview, and an xterm.js terminal backed by a real `node-pty` shell over a custom Node server
- **AI quality review & auto-fix** — automated code review with self-healing fixes fed back into the project
- **Automated testing** — Playwright-driven browser testing with accessibility checks (axe-playwright)
- **GitHub integration** — OAuth login and one-click push of the generated project to a GitHub repo
- **Document export** — generate supporting docs (requirements, architecture) alongside the code

## Tech Stack

- [Next.js 16](https://nextjs.org) (custom server, App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com) for auth and storage
- [Groq](https://groq.com) / OpenRouter for LLM inference
- Monaco Editor, TLDraw, xterm.js, node-pty
- Tailwind CSS 4, Zustand
- Playwright + Vitest for testing

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- API keys for Groq and/or OpenRouter
- A GitHub OAuth app (for the GitHub push feature)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   GROQ_API_KEY=
   OPENROUTER_API_KEY=
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Run the dev server (a custom `server.js` — not `next dev` — powers the live terminal and preview):

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the custom dev server |
| `npm run build` | Build for production (`next build`) |
| `npm start` | Start the custom server in production mode |

## Project Structure

```
app/            Routes: dashboard, IDE, login, API endpoints
components/     UI components (chat, IDE panels, design canvas, autofix, etc.)
lib/ai/         Generation pipeline stages and LLM provider routing
lib/autofix/    Auto-fix hook and logic
lib/testing/    Browser testing and vision utilities
lib/documents/  Document generation
store/          Zustand state stores
server.js       Custom Node server (terminal, live preview, WebSocket)
```

## Deployment

The app requires a persistent Node process (for `node-pty` and WebSocket support), so it needs a platform that supports custom servers rather than pure serverless functions — e.g. a container/VM deployment. A `Dockerfile` is included.

## License

Private / unpublished.
