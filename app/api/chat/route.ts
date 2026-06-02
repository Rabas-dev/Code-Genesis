import { NextRequest, NextResponse } from 'next/server'
import { callLLM, type ProviderConfig } from '@/lib/ai/providers/llm-router'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface FileContext {
  path: string
  content: string
}

export interface FileChange {
  path: string
  content: string
}

const SYSTEM_PROMPT = `You are an expert full-stack developer embedded inside Code Genesis IDE. You operate AUTONOMOUSLY — when asked to change code, you apply the changes directly without asking for permission.

You have full access to all project files. When modifying code:
1. Make ALL necessary changes across ALL files needed to complete the task
2. Return COMPLETE file contents (not diffs or partial snippets)
3. Be thorough — if a feature requires changes in 3 files, change all 3

CHANGE FORMAT (use for every file you modify):
\`\`\`filepath
app/page.tsx
\`\`\`tsx
<complete new file content here>
\`\`\`

RULES:
- Every code block MUST be preceded by a filepath block showing the exact path
- Always write complete file content — never partial
- Multiple files = multiple filepath+code block pairs
- For explanations only (no code changes), just write prose
- Be direct and concise in your explanation before the code blocks`

export async function POST(req: NextRequest) {
  try {
    const { messages, files, providers }: {
      messages: ChatMessage[]
      files?: FileContext[]
      providers?: ProviderConfig[]
    } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 })
    }

    // Build file context (cap at 50k chars)
    let fileContext = ''
    if (files?.length) {
      let charCount = 0
      const parts: string[] = []
      for (const f of files) {
        const entry = `\n\n\`\`\`filepath\n${f.path}\n\`\`\`\n\`\`\`\n${f.content}\n\`\`\``
        if (charCount + entry.length > 50000) break
        parts.push(entry)
        charCount += entry.length
      }
      if (parts.length) {
        fileContext = `\n\n## Project Files (${parts.length}/${files.length} included)\n${parts.join('')}`
      }
    }

    const systemWithContext = SYSTEM_PROMPT + fileContext

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
      .join('\n\n')

    const reply = await callLLM(systemWithContext, conversationText, providers)

    // Parse all filepath+code block pairs
    // Format: ```filepath\npath\n```\n```lang\ncontent\n```
    const changes: FileChange[] = []
    const filepathRegex = /```filepath\n(.+?)\n```\n```[a-z]*\n([\s\S]*?)```/g
    let match: RegExpExecArray | null
    while ((match = filepathRegex.exec(reply)) !== null) {
      changes.push({
        path: match[1].trim(),
        content: match[2],
      })
    }

    // Strip code blocks from display text, keep prose
    const displayReply = reply
      .replace(/```filepath[\s\S]*?```\n```[a-z]*\n[\s\S]*?```/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return NextResponse.json({ reply: displayReply, changes })
  } catch (err) {
    console.error('[/api/chat]', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
