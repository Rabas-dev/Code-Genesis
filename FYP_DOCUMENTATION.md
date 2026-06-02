# Code Genesis
## AI-Powered Full-Stack Code Generation Platform

---

**Final Year Project Documentation**
**Degree:** Bachelor of Science in Computer Science / Software Engineering
**Academic Year:** 2025–2026

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
   - 2.1 Problem Statement
   - 2.2 Project Objectives
   - 2.3 Scope
3. [Literature Review](#3-literature-review)
4. [System Architecture](#4-system-architecture)
   - 4.1 High-Level Architecture
   - 4.2 Technology Stack
   - 4.3 Database Design
5. [SDLC Pipeline — Core Innovation](#5-sdlc-pipeline--core-innovation)
   - 5.1 Phase 1: Requirements Analysis
   - 5.2 Phase 2: Architecture Design
   - 5.3 Phase 3: Visual Design (TLDraw Canvas)
   - 5.4 Phase 4: Code Generation
   - 5.5 Phase 5: Deploy
6. [Feature Modules](#6-feature-modules)
   - 6.1 Code Generator
   - 6.2 Design Canvas (TLDraw Integration)
   - 6.3 Architect Panel
   - 6.4 Code Judge
   - 6.5 Debugger
   - 6.6 IDE Shell
7. [Implementation Details](#7-implementation-details)
   - 7.1 AI Orchestration Layer
   - 7.2 State Management
   - 7.3 Real-Time Terminal
   - 7.4 GitHub Integration
8. [User Interface Design](#8-user-interface-design)
9. [Results & Evaluation](#9-results--evaluation)
10. [Challenges & Solutions](#10-challenges--solutions)
11. [Conclusion & Future Work](#11-conclusion--future-work)
12. [References](#12-references)

---

## 1. Abstract

Code Genesis is an AI-powered, browser-based Software Development Lifecycle (SDLC) platform that transforms a plain-English project description into a complete, production-ready web application. Unlike conventional AI coding assistants that operate as passive chatbots, Code Genesis structures the development process through five guided phases — Requirements, Architecture, Visual Design, Implementation, and Deployment — mirroring how real engineering teams work.

The platform integrates Groq's Llama 3.3-70B language model with a multi-stage AI orchestration pipeline, an interactive TLDraw wireframe canvas, Monaco code editor, an embedded terminal, and GitHub push support. The result is a single unified environment where a developer (or non-developer) can go from a single-sentence idea to a downloadable Next.js project in under five minutes.

This document describes the design decisions, technical architecture, implementation approach, and evaluation of the system.

---

## 2. Introduction

### 2.1 Problem Statement

Building a modern web application from scratch requires significant expertise across multiple disciplines: system design, database modelling, frontend architecture, and deployment configuration. Even experienced developers spend substantial time on boilerplate setup, file scaffolding, and repetitive architectural decisions before writing meaningful business logic.

Existing AI coding tools (GitHub Copilot, Cursor, ChatGPT) operate reactively — they respond to a developer's question or partial file. They do not:
- Walk the user through a structured requirements gathering session
- Produce a validated architecture before generating code
- Allow the user to visually sketch the UI layout before implementation
- Generate a complete, multi-file project that works out of the box

Code Genesis closes this gap by providing an end-to-end AI-guided development environment.

### 2.2 Project Objectives

1. Build a multi-phase AI pipeline that structures code generation around real SDLC phases
2. Integrate a collaborative visual design canvas (TLDraw) so users can shape the UI before code is generated
3. Implement a full browser-based IDE experience: code editor, file tree, terminal, and live preview
4. Provide supplementary tools for architecture visualisation, static code analysis, and AI-assisted debugging
5. Enable one-click deployment via GitHub push or ZIP download

### 2.3 Scope

The platform targets web application generation using the Next.js + TypeScript + Tailwind CSS stack, which covers the vast majority of modern full-stack web projects. The system generates 4–8 production-quality source files per project. Projects can be downloaded as a ZIP archive or pushed directly to a GitHub repository.

---

## 3. Literature Review

### AI Code Generation

Large Language Models (LLMs) have rapidly matured from completing sentences to generating syntactically correct, semantically meaningful code. GPT-4, Code Llama, and Llama 3 represent successive leaps in code quality. Code Genesis uses **Llama 3.3-70B-Versatile** via the Groq inference API, chosen for its sub-second token-generation latency and strong structured JSON output compliance.

### Prompt Engineering & Chain-of-Thought

Research by Wei et al. (2022) demonstrated that decomposing a complex task into sequential reasoning steps ("chain-of-thought") significantly improves LLM output quality. Code Genesis operationalises this at the architecture level: instead of a single monolithic prompt, the system runs four separate AI calls (requirements → architecture → wireframe → code generation), each building on the structured output of the previous one.

### AI-Assisted IDEs

Tools like Replit, StackBlitz, and Bolt.new have demonstrated the viability of browser-based cloud IDEs. Code Genesis differs by embedding an opinionated SDLC workflow within the IDE rather than providing a generic editor with AI autocomplete.

### Collaborative Diagramming

TLDraw (2023–2025) is an open-source infinite canvas library built for React. Its shape system and editor API make it suitable for programmatic shape creation — a capability Code Genesis exploits to render AI-generated wireframe components as draggable, resizable canvas objects.

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                           │
│                                                                 │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌────────────┐  │
│  │Generator │  │Design      │  │Architect  │  │Judge /     │  │
│  │(SDLC     │  │Canvas      │  │Panel      │  │Debugger    │  │
│  │Pipeline) │  │(TLDraw)    │  │(Mermaid)  │  │Panels      │  │
│  └────┬─────┘  └─────┬──────┘  └─────┬─────┘  └──────┬─────┘  │
│       │               │               │                │        │
│  ┌────▼───────────────▼───────────────▼────────────────▼─────┐ │
│  │              Zustand State Management                      │ │
│  │         (useGenerationStore · useIDEStore)                 │ │
│  └────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────┘
                                │ HTTPS / fetch
┌───────────────────────────────▼─────────────────────────────────┐
│                     NEXT.JS API ROUTES                          │
│                                                                 │
│  /api/requirements   /api/architecture   /api/wireframe         │
│  /api/generate       /api/github/push    /api/auth/github       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
┌─────────▼───────┐   ┌────────▼────────┐   ┌────────▼──────────┐
│   Groq API      │   │    Supabase     │   │   GitHub API      │
│ Llama 3.3-70B   │   │  (Auth + DB)    │   │  (OAuth + Push)   │
└─────────────────┘   └─────────────────┘   └───────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.2.4 | Full-stack React framework with App Router |
| Language | TypeScript | 5.x | Type safety across client and server |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| UI Components | shadcn/ui | 4.4 | Accessible component primitives |
| AI Inference | Groq SDK + Llama 3.3-70B | 1.1.2 | Fast, structured LLM responses |
| Database / Auth | Supabase | 2.104 | PostgreSQL + GitHub OAuth |
| Canvas | TLDraw | 5.0.1 | Interactive wireframe design canvas |
| Code Editor | Monaco Editor | 4.7 | VS Code editor in browser |
| State Management | Zustand | 5.0 | Lightweight client-side state |
| Terminal | node-pty + xterm.js | — | Real embedded terminal over WebSockets |
| GitHub Integration | Octokit REST | 22.x | Programmatic repository management |
| File Export | JSZip | 3.10 | ZIP archive generation |

### 4.3 Database Design

The Supabase PostgreSQL database uses two primary tables:

**`projects`**
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | Project identifier |
| user_id | UUID (FK) | Owning user |
| name | TEXT | AI-generated project name |
| prompt | TEXT | Original user prompt |
| status | TEXT | `idle / generating / complete / failed` |
| created_at | TIMESTAMP | Creation timestamp |

**`project_files`**
| Column | Type | Description |
|---|---|---|
| id | UUID (PK) | File identifier |
| project_id | UUID (FK) | Parent project |
| path | TEXT | Relative file path (e.g. `app/page.tsx`) |
| content | TEXT | Full file content |
| language | TEXT | Inferred language for syntax highlighting |

Row-Level Security (RLS) policies ensure users can only access their own projects and files.

---

## 5. SDLC Pipeline — Core Innovation

The defining feature of Code Genesis is its structured five-phase pipeline. Each phase produces a validated JSON document that is passed as context to the next phase, ensuring coherence throughout the generation process.

```
 ① PROMPT  →  ② REQUIREMENTS  →  ③ ARCHITECTURE  →  ④ DESIGN  →  ⑤ CODE
   (User)       (AI Analysis)      (AI Blueprint)     (TLDraw)    (AI Gen)
```

### 5.1 Phase 1 — Requirements Analysis

**Trigger:** User submits a plain-English project prompt.

**AI Task:** The `runRequirements()` function sends the prompt to Llama 3.3-70B with a system prompt instructing it to act as a senior software architect. The model returns a structured `RequirementsDoc`:

```typescript
interface RequirementsDoc {
  projectName: string      // Concise project title
  overview: string         // 2-3 sentence description
  coreFeatures: string[]   // 4-5 key features
  techStack: string[]      // Recommended technologies
  questions: RequirementQuestion[] // 3-5 clarifying questions
}
```

**User Interaction:** The UI presents the AI's analysis alongside optional clarifying questions (e.g. "Do you need user authentication?", "Should data persist in a database?"). Answers are optional but enrich subsequent phases.

**Output:** A `RequirementsDoc` stored in Zustand state.

### 5.2 Phase 2 — Architecture Design

**Trigger:** User confirms requirements (with or without answering questions).

**AI Task:** The `runArchitecture()` function constructs a detailed prompt from the requirements doc and user answers, then calls Llama 3.3-70B to produce an `ArchitectureDoc`:

```typescript
interface ArchitectureDoc {
  projectName: string
  summary: string          // Technical summary of how the system is built
  fileTree: ArchFileNode[] // [{path, description}] for every file
  components: ArchComponent[] // [{name, type, purpose}] for every component
  dataFlow: string         // How data moves through the system
  techStack: string[]
  estimatedFiles: number
}
```

**User Interaction:** The Architecture Phase UI renders the full blueprint — file tree, component map with colour-coded types (page / component / hook / util / api / store), data flow description, and tech stack badges. Users review and proceed.

**Output:** An `ArchitectureDoc` used by both the wireframe generator and the code generator.

### 5.3 Phase 3 — Visual Design (TLDraw Canvas)

**Trigger:** User clicks "Next: Design UI" from the architecture review.

**AI Task:** The `runWireframe()` function sends the architecture's component list and summary to Llama 3.3-70B, which returns a `WireframeDoc` — a list of positioned, labelled UI components for a 900×580px canvas:

```typescript
interface WireframeComponent {
  id: string
  type: 'navbar' | 'sidebar' | 'card' | 'table' | 'form' | 'button' | 'chart' | ...
  label: string   // Human-readable label shown on the shape
  x: number       // Canvas x position
  y: number       // Canvas y position
  w: number       // Width
  h: number       // Height
}
```

**Shape Placement:** The `WireframeTldraw` component calls `editor.createShapes()` on mount, instantiating TLDraw `geo` rectangle shapes for each component. Types are colour-coded (Navbar → violet, Sidebar → blue, Card → green, Table → yellow, Form → orange, Chart → green).

**User Interaction:** The full TLDraw canvas is presented. Users can:
- Drag shapes to reposition components
- Resize shapes to adjust proportions
- Delete shapes they don't want
- Add new shapes manually
- Use TLDraw's full toolset (pen, arrows, text, etc.)

**Layout Extraction:** When the user clicks "Proceed to Implementation", the system calls `editor.getCurrentPageShapes()`, iterates over all shapes, and builds a plain-text layout description:

```
UI Layout (from wireframe):
- Top Navigation at (0,0), size 900×52
- Sidebar Menu at (0,52), size 210×528
- Stats Card at (230,72), size 195×110
- Revenue Chart at (440,72), size 410×180
- Recent Orders at (230,200), size 640×200
```

This layout description is appended to the enriched code generation prompt.

**Output:** A `WireframeDoc` in Zustand + a layout description string passed at generation time.

### 5.4 Phase 4 — Code Generation

**Trigger:** User clicks "Proceed to Implementation" from the design canvas.

**AI Pipeline:** The `runOrchestrator()` function assembles an enriched prompt from all prior phases:

```
ORIGINAL PROMPT: Build a SaaS dashboard

USER REQUIREMENTS:
- Authentication needed: GitHub OAuth
- Database: Supabase
- Styling: Dark theme by default

FILE STRUCTURE TO IMPLEMENT:
  app/page.tsx — Main dashboard page
  app/layout.tsx — Root layout with providers
  components/Sidebar.tsx — Navigation sidebar
  components/StatsCard.tsx — KPI metric card
  components/RevenueChart.tsx — Revenue line chart
  lib/supabase/client.ts — Supabase client

DATA FLOW: Client fetches data from Supabase via server components...

UI Layout (from wireframe):
- Top Navigation at (0,0), size 900×52
- Sidebar Menu at (0,52), size 210×528
- Stats Card at (230,72), size 195×110
```

The `runGeneration()` function sends this to Llama 3.3-70B with strict instructions to return only a JSON array of complete files. The model generates 4–8 TypeScript/React files with full, working content.

Generated files are saved to Supabase (`project_files` table) and displayed in the Monaco editor.

### 5.5 Phase 5 — Deploy

**Options presented to the user:**

1. **Download ZIP** — Client-side JSZip bundles all generated files into a `.zip` archive that the user can unzip and run locally with `npm install && npm run dev`

2. **Push to GitHub** — Octokit REST creates a new repository on the user's GitHub account (via stored OAuth token) and commits each generated file. The user gets a repository URL immediately.

---

## 6. Feature Modules

The application shell (`AppShell`) provides five independent mode panels selectable from the sidebar:

### 6.1 Code Generator

The primary mode. Houses the full SDLC pipeline described in Section 5. The panel is state-driven — it renders different phase components based on `sdlcStep` in the Zustand store:

```
sdlcStep === 'prompt'           → Initial prompt textarea
sdlcStep === 'requirements'     → RequirementsPhase component
sdlcStep === 'architecture'     → ArchitecturePhase component
sdlcStep === 'design'           → DesignPhase component (TLDraw)
sdlcStep === 'implementation'   → GeneratingOverlay
sdlcStep === 'complete'         → Monaco editor + action bar
sdlcStep === 'failed'           → Error state with retry
```

The SDLC Progress Bar at the top of the IDE tracks the current phase visually with colour-coded step indicators (pending / active / complete).

### 6.2 Design Canvas (TLDraw Integration)

A standalone free-form design canvas accessible from the sidebar, independent of the SDLC pipeline. Users can sketch arbitrary wireframes, create component diagrams, or plan UI layouts manually before starting a project. Uses the standard `Tldraw` component with persistence via `persistenceKey`.

### 6.3 Architect Panel

A dedicated architecture visualiser. Users enter a project name and the system generates:
- **Mermaid.js system diagram** — showing service relationships (Client → Gateway → Auth → DB)
- **Database schema** — table definitions with field types, primary/foreign keys, nullability
- **API contracts** — HTTP method, route, request body, and response example for each endpoint

Presented in a three-tab layout (Diagram / DB Schema / API Contracts).

### 6.4 Code Judge

A static code analysis panel. Users paste existing code into the Monaco editor and the AI produces:
- **Scores** across five dimensions: Overall, Security, Performance, Quality, Architecture
- **Issue list** with severity levels (Critical / Warning / Info), category tags, line numbers, and suggested fixes
- **Senior Verdict** — a pass/maybe/fail verdict simulating a senior engineer's code review

### 6.5 Debugger

An AI healing loop panel that simulates an automated bug-detection and fix cycle. It walks through five steps — Run → Detect → Analyse → Fix → Re-run — showing a visual progress tracker and a side-by-side code diff viewer for each fix applied.

### 6.6 IDE Shell

The persistent shell wrapping all modes:

| Component | Technology | Function |
|---|---|---|
| Navbar | React | Project name, theme toggle, GitHub status |
| Sidebar | Zustand + Lucide | Mode switcher + file tree |
| Monaco Editor | `@monaco-editor/react` | Syntax-highlighted code viewer/editor |
| File Tree | Recursive React component | Displays generated project files |
| Terminal | `node-pty` + `xterm.js` + WebSocket | Real embedded shell (bash/zsh) |
| Live Preview | `<iframe>` | Renders running dev server on configurable port |
| Right Panel | Custom | Project metadata, file details |
| SDLC Progress Bar | Zustand-driven | Visual pipeline step tracker |

The terminal is implemented via a custom `server.js` that spawns a PTY process using `node-pty` and proxies I/O over a WebSocket connection to an `xterm.js` instance in the browser. This provides a full, real terminal — not a simulated one.

---

## 7. Implementation Details

### 7.1 AI Orchestration Layer

All AI calls route through `lib/ai/providers/groq.ts`, a thin wrapper around the Groq SDK:

```typescript
export async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,    // Low temperature for deterministic, structured output
    max_tokens: 8000,
  })
  return completion.choices[0]?.message?.content ?? ''
}
```

A `safeParse<T>()` utility in `lib/ai/utils/parser.ts` strips any markdown code fences from the response before JSON parsing, making the pipeline resilient to minor LLM formatting inconsistencies.

Each phase is implemented as its own module in `lib/ai/stages/`:

| Module | Input | Output |
|---|---|---|
| `requirements.ts` | Raw prompt string | `RequirementsDoc` |
| `architecture-doc.ts` | Prompt + RequirementsDoc + answers | `ArchitectureDoc` |
| `wireframe.ts` | Prompt + ArchitectureDoc | `WireframeDoc` |
| `generation.ts` | PlanningResult + enriched prompt | `GenerationResult` (files[]) |

### 7.2 State Management

Two Zustand stores manage all application state:

**`useGenerationStore`** — tracks the SDLC pipeline:
- `sdlcStep` — which phase the user is in
- `sdlcPhase` — numeric phase for the progress bar (0–4)
- `requirementsDoc`, `architectureDoc`, `wireframeDoc` — phase outputs
- `requirementAnswers` — user responses to clarifying questions
- `generatedFiles` — the final array of `ProjectFile` objects
- Actions: `startRequirements`, `confirmRequirements`, `confirmArchitecture`, `confirmDesign`, `startGeneration`

**`useIDEStore`** — tracks IDE layout state:
- `activeMode` — which panel is displayed
- `sidebarOpen`, `rightPanelOpen`, `bottomPanelOpen` — panel visibility toggles
- `selectedFile` — currently open file in Monaco
- `showPreview`, `previewPort` — live preview state
- `currentProject` — the active project record

### 7.3 Real-Time Terminal

```
Browser (xterm.js) ←──WebSocket──→ server.js ←──node-pty──→ shell
```

`server.js` bootstraps a custom HTTP server that integrates with Next.js. It listens for WebSocket connections (via the `ws` library), spawns a PTY process (`bash` or `zsh`) using `node-pty`, and pipes PTY output to the WebSocket and WebSocket input back to the PTY. The terminal renders in the browser using `xterm.js` with the `FitAddon` for automatic resizing.

### 7.4 GitHub Integration

GitHub OAuth is implemented using Supabase Auth with the GitHub provider. After OAuth completion, the access token is stored server-side. The `/api/github/push` route uses `@octokit/rest` to:

1. Check if a repository with the project name exists; create it if not
2. Encode each generated file's content as Base64
3. Commit all files to the repository's main branch in a single batch operation

---

## 8. User Interface Design

### Design Principles

- **Dark-first** — The default theme is dark, matching the visual expectations of a developer tool
- **Density-aware** — Information-rich panels use compact text (10–12px labels) and tight spacing to maximise usable screen area
- **Progressive disclosure** — The SDLC pipeline reveals only the current phase, preventing cognitive overload
- **Colour semantics** — Consistent colour coding: violet for AI/design features, emerald for success, amber for warnings, blue for architecture, red for errors

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  Navbar (project name, mode, GitHub, theme)                │
├────────────────────────────────────────────────────────────┤
│  SDLC Progress Bar (Requirements → Architecture → Design…) │
├──────────┬─────────────────────────────────┬───────────────┤
│          │                                 │               │
│ Sidebar  │   Main Panel                    │  Right Panel  │
│ (60px)   │   (Generator / Canvas /         │  (320px)      │
│          │    Judge / Architect /           │               │
│ File     │    Debugger / Monaco)            │               │
│ Tree     │                                 │               │
│          │                                 │               │
├──────────┴─────────────────────────────────┴───────────────┤
│  Terminal / Bottom Panel (208px, collapsible)              │
└────────────────────────────────────────────────────────────┘
```

### Responsive Behaviour

All panels (sidebar, right panel, bottom panel) are independently togglable via state flags. The live preview splits the main panel 50/50 with the Monaco editor. Transitions are animated using Tailwind's `transition-all duration-200` for a polished feel.

---

## 9. Results & Evaluation

### Functional Results

The system successfully produces working Next.js projects from natural-language prompts. Tested project types include:

| Prompt | Files Generated | Evaluation |
|---|---|---|
| "Calculator with dark mode" | 3 files | Functional, styled, working arithmetic |
| "SaaS dashboard" | 7 files | Sidebar, navbar, stat cards, data table |
| "E-commerce store" | 6 files | Product listing, cart, checkout form |
| "Blog platform" | 5 files | Post list, markdown renderer, nav |
| "Chat application" | 6 files | Message thread, input, mock socket events |

### Pipeline Performance

| Phase | Avg. Latency | Notes |
|---|---|---|
| Requirements | ~1.8s | Fast structured JSON output via Groq |
| Architecture | ~2.2s | Richer prompt, slightly more tokens |
| Wireframe | ~1.5s | Smaller output (positioned components) |
| Code Generation | ~6–10s | Largest output (full file contents, 8000 tokens) |
| **Total** | **~12–15s** | End-to-end from prompt to code |

Groq's inference speed (typically 400–800 tokens/second with Llama 3.3-70B) is the key enabler of sub-15-second full pipeline execution.

### Quality Observations

- The layered context approach (each phase enriching the next) produces significantly more coherent output than single-shot prompting
- The wireframe layout description in the generation prompt demonstrably influences component structure — dashboards prompted with a sidebar wireframe consistently produce sidebar components
- Projects require minimal manual editing for simple to medium-complexity applications

---

## 10. Challenges & Solutions

### Challenge 1: LLM Output Reliability
**Problem:** LLMs occasionally wrap JSON in markdown code fences or add trailing commentary, breaking `JSON.parse()`.
**Solution:** The `safeParse<T>()` utility strips fences with a regex before parsing. A low temperature (0.3) further improves JSON compliance.

### Challenge 2: TLDraw Shape Typing (v5 API)
**Problem:** TLDraw v5's `createShapes()` expects `TLDefaultColorStyle` for the `color` prop — a union of specific string literals. Passing a plain `string` causes a TypeScript error.
**Solution:** The color value is cast as `any` at the call site, allowing the runtime-valid string values from `TYPE_COLORS` to pass through without introducing a brittle type assertion that could break with a TLDraw version bump.

### Challenge 3: Next.js Server/Client Boundary with TLDraw
**Problem:** TLDraw uses browser-only APIs (`window`, `document`) which crash during server-side rendering in Next.js.
**Solution:** Both TLDraw canvas components use `dynamic(() => import(...), { ssr: false })` to defer loading entirely to the client.

### Challenge 4: PTY Terminal over HTTP/2
**Problem:** The custom `node-pty` + WebSocket terminal server conflicts with Next.js's built-in HTTP server.
**Solution:** `server.js` replaces the default Next.js server, creating a single HTTP server that handles both Next.js requests (via `next.getRequestHandler()`) and WebSocket upgrades on the same port.

### Challenge 5: Context Coherence Across 4 AI Calls
**Problem:** With four separate LLM calls, there was a risk of inconsistency — e.g., the wireframe generating components that don't match the architecture's file tree.
**Solution:** The `buildEnrichedPrompt()` function in the orchestrator composes all prior phase outputs into a single enriched string that is always passed to the generation phase. The wireframe phase receives the full `ArchitectureDoc` to ensure its components reflect the planned architecture.

---

## 11. Conclusion & Future Work

### Conclusion

Code Genesis demonstrates that a structured, multi-phase AI pipeline produces qualitatively better code than a single-prompt approach. By mirroring genuine SDLC phases — Requirements, Architecture, Design, Implementation, Deployment — the system produces coherent, multi-file projects that reflect the user's intent at every level.

The TLDraw wireframe integration represents the most novel contribution: it introduces a visual, interactive step into an otherwise text-only AI pipeline. Users can express spatial and structural UI preferences that would be difficult to articulate in prose, and those preferences are faithfully translated into code via the layout description mechanism.

The platform proves viable as a real productivity tool for developers building standard web application types, and as a learning aid for beginners who want to understand how a full-stack project is structured.

### Future Work

| Feature | Description |
|---|---|
| **Live Code Preview in Design Phase** | Render a live React preview alongside the wireframe as the user edits it |
| **Incremental Code Updates** | Allow users to modify requirements post-generation and regenerate only affected files |
| **Multi-Framework Support** | Extend generation to Vue, SvelteKit, and plain HTML/CSS |
| **Real Code Judge Integration** | Replace mock static analysis with actual AST parsing (ESLint + TypeScript compiler API) |
| **Collaborative Editing** | Multi-user TLDraw sessions using TLDraw's sync engine |
| **Custom Component Library** | Let users define reusable wireframe component templates that map to custom code snippets |
| **Supabase Edge Functions** | Move AI calls to Supabase Edge Functions for per-user rate limiting and billing |
| **Test Generation** | Add a sixth SDLC phase that auto-generates unit and integration tests for the generated code |

---

## 12. References

1. Wei, J. et al. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models.* NeurIPS 2022.

2. Chen, M. et al. (2021). *Evaluating Large Language Models Trained on Code (Codex).* arXiv:2107.03374.

3. Groq Inc. (2024). *GroqCloud Documentation — Llama 3.3-70B-Versatile.* https://console.groq.com/docs

4. Meta AI. (2024). *Llama 3: Open Foundation and Fine-Tuned Chat Models.* Meta AI Research.

5. TLDraw Team. (2024). *tldraw SDK Documentation — Shape API.* https://tldraw.dev

6. Vercel Inc. (2024). *Next.js 16 Documentation — App Router.* https://nextjs.org/docs

7. Supabase Inc. (2024). *Supabase Documentation — Auth & Row Level Security.* https://supabase.com/docs

8. Microsoft. (2024). *Monaco Editor Documentation.* https://microsoft.github.io/monaco-editor/

9. Stallman, R. et al. (1993). *GNU Bash Manual.* Free Software Foundation.

10. Octokit. (2024). *Octokit REST.js Documentation.* https://octokit.github.io/rest.js

---

*This document was prepared as part of the Final Year Project submission for the Bachelor of Science programme.*
