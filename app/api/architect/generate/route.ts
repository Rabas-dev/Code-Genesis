import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'
import { safeParse } from '@/lib/ai/utils/parser'
import type { ArchitectureResult } from '@/types'

const SYSTEM_PROMPT = `You are a Principal Software Architect designing scalable production systems.

You MUST return ONLY valid JSON. No markdown. No explanation. No trailing text.

Return exactly this shape:
{
  "projectName": "<name>",
  "systemOverview": "<2-3 sentence technical summary>",
  "mermaidDiagram": "<valid Mermaid graph TD string showing the system architecture>",
  "systemDiagram": {
    "nodes": [
      { "id": "n1", "label": "<label>", "type": "client" | "server" | "database" | "service" }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "label": "<optional>" }
    ]
  },
  "databaseSchema": {
    "tables": [
      {
        "name": "<table name>",
        "columns": [
          { "name": "<col>", "type": "<SQL type>", "primary": true | false, "foreignKey": "<ref or omit>" }
        ]
      }
    ]
  },
  "apiRoutes": [
    {
      "method": "GET" | "POST" | "PUT" | "DELETE",
      "route": "/api/<path>",
      "description": "<what it does>",
      "requestBody": "<JSON example or omit>",
      "responseBody": "<JSON example or omit>"
    }
  ],
  "techStack": ["<technology>"]
}`

export async function POST(req: NextRequest) {
  try {
    const { projectName, requirements, providers }: {
      projectName: string
      requirements?: string
      providers?: ProviderConfig[]
    } = await req.json()
    if (!projectName?.trim()) return NextResponse.json({ error: 'projectName is required' }, { status: 400 })

    const userPrompt = `Design a complete production architecture for:

Project: ${projectName}

Requirements:
${requirements ?? '(no additional requirements specified)'}

Return the architecture JSON.`

    const raw = await callLLM(SYSTEM_PROMPT, userPrompt, providers)
    const result = safeParse<ArchitectureResult>(raw)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/architect/generate]', err)
    return NextResponse.json({ error: 'Architecture generation failed' }, { status: 500 })
  }
}
