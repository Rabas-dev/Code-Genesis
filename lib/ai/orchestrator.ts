import { runPlanning, type PlanningResult } from './stages/planning'
import { runGeneration, type GenerationResult } from './stages/generation'
import type { RequirementsDoc } from './stages/requirements'
import type { ArchitectureDoc } from './stages/architecture-doc'
import type { ProviderConfig } from './providers/llm-router'

export interface OrchestratorResult {
  stages: {
    planning: PlanningResult
    generation: GenerationResult
  }
}

export async function runOrchestrator(
  prompt: string,
  requirements?: RequirementsDoc,
  architecture?: ArchitectureDoc,
  answers?: Record<string, string>,
  layoutDescription?: string,
  providers?: ProviderConfig[]
): Promise<OrchestratorResult> {
  // If we have architecture context from the multi-phase flow, skip planning
  let planning: PlanningResult
  if (architecture) {
    planning = {
      stage: 'planning',
      progress: 50,
      projectName: architecture.projectName,
      features: architecture.components.map((c) => c.name),
      description: architecture.summary,
      techStack: architecture.techStack,
      fileCount: architecture.estimatedFiles,
    }
  } else {
    planning = await runPlanning(prompt, providers)
  }

  // Build enriched prompt if we have full context
  const enrichedPrompt = architecture
    ? buildEnrichedPrompt(prompt, requirements, architecture, answers, layoutDescription)
    : prompt

  const generation = await runGeneration(planning, enrichedPrompt, providers)

  return {
    stages: { planning, generation },
  }
}

function buildEnrichedPrompt(
  prompt: string,
  requirements?: RequirementsDoc,
  architecture?: ArchitectureDoc,
  answers?: Record<string, string>,
  layoutDescription?: string
): string {
  const lines: string[] = [`ORIGINAL PROMPT: ${prompt}`]

  if (requirements && answers) {
    const qa = requirements.questions
      .filter((q) => answers[q.id]?.trim())
      .map((q) => `- ${q.question}: ${answers[q.id]}`)
    if (qa.length > 0) {
      lines.push(`\nUSER REQUIREMENTS:\n${qa.join('\n')}`)
    }
  }

  if (architecture) {
    const fileList = architecture.fileTree.map((f) => `  ${f.path} — ${f.description}`).join('\n')
    lines.push(`\nFILE STRUCTURE TO IMPLEMENT:\n${fileList}`)
    lines.push(`\nDATA FLOW: ${architecture.dataFlow}`)
  }

  if (layoutDescription?.trim()) {
    lines.push(`\n${layoutDescription}`)
  }

  return lines.join('\n')
}
