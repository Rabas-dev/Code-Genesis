import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { ArchitectureDoc } from './architecture-doc'

export interface WireframeComponent {
  id: string
  type: 'navbar' | 'sidebar' | 'card' | 'table' | 'form' | 'button' | 'header' | 'list' | 'chart' | 'modal'
  label: string
  x: number
  y: number
  w: number
  h: number
}

export interface WireframeDoc {
  title: string
  components: WireframeComponent[]
}

const SYSTEM_PROMPT = `You are a UI/UX architect. Generate a wireframe layout as structured JSON for a web application.

Canvas size: 900 x 580 pixels. Use these placement rules:
- Navbar: spans full width at top → { x:0, y:0, w:900, h:52 }
- Sidebar: left column below navbar → { x:0, y:52, w:210, h:528 }
- Content area: starts at x:230, y:72 with width 650, height 490
- Cards: place in rows of 2-3 inside content area, each card ~200x110
- Tables: wide, ~640x200, inside content area
- Forms: ~360x280, inside content area
- Charts: ~300x180, inside content area
- Buttons: small, ~120x40

Use only these "type" values: navbar, sidebar, card, table, form, button, header, list, chart, modal

Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "<project name>",
  "components": [
    { "id": "c1", "type": "navbar", "label": "Top Navigation", "x": 0, "y": 0, "w": 900, "h": 52 },
    { "id": "c2", "type": "sidebar", "label": "Sidebar Menu", "x": 0, "y": 52, "w": 210, "h": 528 }
  ]
}`

export async function runWireframe(architecture: ArchitectureDoc, prompt: string, providers?: ProviderConfig[]): Promise<WireframeDoc> {
  const componentNames = architecture.components
    .filter((c) => c.type === 'page' || c.type === 'component')
    .map((c) => `${c.name} (${c.purpose})`)
    .join(', ')

  const userMessage = `
Project: ${architecture.projectName}
Original prompt: ${prompt}
UI Components to place: ${componentNames || architecture.components.map((c) => c.name).join(', ')}
Tech stack: ${architecture.techStack.join(', ')}
Summary: ${architecture.summary}

Generate a realistic wireframe layout for the main view/dashboard of this project. Include 5-10 components. Do not overlap components. Leave 20px gaps between elements.`

  const raw = await callLLM(SYSTEM_PROMPT, userMessage, providers)
  return safeParse<WireframeDoc>(raw)
}
