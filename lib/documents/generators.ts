import type { RequirementsDoc } from '@/lib/ai/stages/requirements'
import type { ArchitectureDoc } from '@/lib/ai/stages/architecture-doc'
import type { ProjectFile } from '@/types'

// ── Helpers ──────────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function reqId(index: number, type: 'F' | 'NF' | 'C'): string {
  return `REQ-${type}-${String(index + 1).padStart(3, '0')}`
}

const MOSCOW_LABELS: Record<number, string> = {
  0: 'MUST',
  1: 'MUST',
  2: 'SHOULD',
  3: 'SHOULD',
  4: 'COULD',
}

// ── 1. Software Requirements Specification (SRS) — IEEE 830 compliant ─────────
export function generateSRS(
  doc: RequirementsDoc,
  prompt: string,
  answers: Record<string, string>,
): string {
  // Build answered clarifications
  const clarifications = doc.questions
    .map((q, i) => {
      const ans = answers[q.id]?.trim() || '_Not specified_'
      return `**Q${i + 1}:** ${q.question}\n\n**A:** ${ans}`
    })
    .join('\n\n---\n\n')

  // Functional requirements table with IDs and MoSCoW
  const frRows = doc.coreFeatures.map((f, i) => {
    const id = reqId(i, 'F')
    const priority = MOSCOW_LABELS[i] ?? 'COULD'
    const acceptance = `The system successfully implements ${f.toLowerCase()} and all related user interactions function without error.`
    return `| ${id} | ${f} | The system **shall** provide ${f.toLowerCase()}. | \`${priority}\` | ${acceptance} |`
  }).join('\n')

  // Non-functional requirements
  const nfrs = [
    { name: 'Performance', req: 'All pages shall load within 3 seconds on a standard broadband connection. API responses shall complete within 2 seconds under normal load.' },
    { name: 'Usability', req: 'The interface shall be responsive across screen sizes ≥ 320px. All interactive elements shall have visible focus indicators. WCAG 2.1 AA compliance is required.' },
    { name: 'Security', req: 'All user inputs shall be validated and sanitized server-side. Authentication tokens shall be stored securely. No sensitive data shall be exposed in client-side code.' },
    { name: 'Reliability', req: 'The system shall target 99.5% uptime. Errors shall be caught and presented to users with actionable messages rather than raw stack traces.' },
    { name: 'Maintainability', req: 'Code shall be written in TypeScript with strict mode enabled. Component boundaries shall be clearly separated. No function shall exceed 50 lines without documented justification.' },
    { name: 'Portability', req: 'The application shall run in any Node.js ≥ 18 environment with npm available. It shall be deployable to Vercel, Railway, or any Docker-compatible host without modification.' },
    { name: 'Scalability', req: 'The architecture shall support horizontal scaling. Stateless API routes shall allow multiple concurrent instances without shared in-memory state.' },
  ]

  const nfrRows = nfrs.map((n, i) => {
    const id = reqId(i, 'NF')
    return `| ${id} | ${n.name} | ${n.req} | \`MUST\` |`
  }).join('\n')

  // Constraints
  const constraints = [
    `Tech stack is fixed: ${doc.techStack.join(', ')}`,
    'The system must run without requiring a local database installation (use hosted services or local-storage fallbacks)',
    'No proprietary or commercial-only dependencies may be introduced without explicit approval',
  ]

  const constraintRows = constraints.map((c, i) => {
    const id = reqId(i, 'C')
    return `| ${id} | ${c} |`
  }).join('\n')

  // Traceability matrix: each FR → Design component → Test case
  const traceRows = doc.coreFeatures.map((f, i) => {
    const fid = reqId(i, 'F')
    const component = `${f.replace(/\s+/g, '')}Component`
    const testCase = `TC-${String(i + 1).padStart(3, '0')}: Verify ${f.toLowerCase()} renders and operates correctly`
    return `| ${fid} | ${f} | \`${component}\` | ${testCase} |`
  }).join('\n')

  return `# Software Requirements Specification (SRS)

> **Standard:** IEEE 830-1998 / ISO/IEC/IEEE 29148:2018

| Field | Value |
|-------|-------|
| **Project** | ${doc.projectName} |
| **Document Version** | 1.0 |
| **Status** | Draft |
| **Date** | ${today()} |
| **Prepared by** | Code Genesis — AI-Powered SDLC IDE |
| **Confidentiality** | Internal |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [External Interface Requirements](#3-external-interface-requirements)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Constraints](#6-constraints)
7. [Requirement Clarifications](#7-requirement-clarifications)
8. [Traceability Matrix](#8-traceability-matrix)
9. [Glossary](#9-glossary)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a comprehensive description of the software requirements for **${doc.projectName}**. It is intended to be used by the development team, project stakeholders, and evaluators to understand the system's scope, functionality, and constraints.

This document follows the IEEE 830-1998 standard for SRS structure and the ISO/IEC/IEEE 29148:2018 standard for requirements engineering.

### 1.2 Scope

**${doc.projectName}** is a web application that ${doc.overview}

The system is in-scope for this document. Third-party services (authentication providers, cloud hosting platforms, external APIs) are out-of-scope but are identified as dependencies in Section 3.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|-----------|
| **SRS** | Software Requirements Specification |
| **FR** | Functional Requirement |
| **NFR** | Non-Functional Requirement |
| **MoSCoW** | Prioritization method: Must Have / Should Have / Could Have / Won't Have |
| **WCAG** | Web Content Accessibility Guidelines |
| **API** | Application Programming Interface |
| **UI** | User Interface |
| **SDLC** | Software Development Life Cycle |

### 1.4 References

- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications
- ISO/IEC/IEEE 29148:2018: Systems and software engineering — Requirements engineering
- WCAG 2.1 AA: Web Content Accessibility Guidelines

### 1.5 Overview

Section 2 provides an overall description of the product. Section 4 contains functional requirements. Section 5 covers non-functional requirements. Section 8 provides full traceability between requirements, design components, and test cases.

---

## 2. Overall Description

### 2.1 Product Perspective

${doc.projectName} is a standalone web application built on a modern front-end stack. It operates as a self-contained system deployable to any Node.js hosting environment. The system does not depend on a pre-existing platform and can be run independently.

### 2.2 Product Functions

The system provides the following high-level capabilities:

${doc.coreFeatures.map((f, i) => `${i + 1}. **${f}**`).join('\n')}

### 2.3 User Classes and Characteristics

| User Class | Description | Technical Level |
|------------|-------------|-----------------|
| **Primary User** | End users who interact with the system's core features | Moderate |
| **Administrator** | Users with elevated permissions to manage system content | High |
| **Visitor** | Unauthenticated users with read-only or limited access | Low |

### 2.4 Operating Environment

- **Client:** Any modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Runtime:** Node.js ≥ 18.x
- **Framework:** ${doc.techStack[0] ?? 'Next.js'} with ${doc.techStack[1] ?? 'TypeScript'}
- **Deployment:** Vercel, Railway, Docker, or any Node.js-compatible PaaS

### 2.5 Design and Implementation Constraints

- The system must be implemented using the approved tech stack: **${doc.techStack.join(', ')}**
- All UI components must be accessible per WCAG 2.1 AA
- No commercial-only runtime licenses may be used

### 2.6 Assumptions and Dependencies

- Users have access to a modern browser with JavaScript enabled
- Internet connectivity is available for external API calls
- Hosting environment provides HTTPS

---

## 3. External Interface Requirements

### 3.1 User Interfaces

- The application shall provide a responsive web interface compatible with desktop (≥1024px) and tablet (≥768px) viewports
- All forms shall include visible labels, placeholder hints, and inline validation messages
- A consistent navigation structure shall be present on all authenticated pages

### 3.2 Software Interfaces

| Interface | Type | Purpose |
|-----------|------|---------|
| ${doc.techStack[0] ?? 'Next.js'} | Framework | Application routing and rendering |
${doc.techStack.slice(1).map(t => `| ${t} | Library/Tool | Core dependency |`).join('\n')}

### 3.3 Communication Interfaces

- All client-server communication shall use HTTPS
- REST API endpoints shall return JSON with appropriate HTTP status codes
- Error responses shall follow the format \`{ "error": "<message>", "code": "<error_code>" }\`

---

## 4. Functional Requirements

> **Priority Legend:** \`MUST\` — mandatory · \`SHOULD\` — high priority · \`COULD\` — nice to have · \`WON'T\` — explicitly out of scope

| Req ID | Feature | Requirement Statement | Priority | Acceptance Criteria |
|--------|---------|----------------------|----------|---------------------|
${frRows}

### 4.1 Original Request Context

> "${prompt}"

---

## 5. Non-Functional Requirements

| Req ID | Category | Requirement | Priority |
|--------|----------|-------------|----------|
${nfrRows}

---

## 6. Constraints

| Constraint ID | Description |
|---------------|-------------|
${constraintRows}

---

## 7. Requirement Clarifications

The following clarifications were gathered during the requirements analysis phase to refine the scope and implementation details:

${clarifications || '_No clarifications were recorded for this project._'}

---

## 8. Traceability Matrix

This matrix maps each functional requirement to its corresponding design component and test case, ensuring full coverage from requirements through testing.

| Req ID | Requirement | Design Component | Test Case |
|--------|-------------|-----------------|-----------|
${traceRows}

---

## 9. Glossary

| Term | Definition |
|------|-----------|
| **Component** | A self-contained, reusable UI module |
| **Route** | A URL path mapped to a page or API handler |
| **State** | Runtime data managed by the application |
| **Hook** | A React function for managing component-level side effects |
| **Deployment** | The process of making the application available in a production environment |

---

*This document was generated by **Code Genesis** — AI-Powered SDLC IDE.*
*It conforms to IEEE 830-1998 and ISO/IEC/IEEE 29148:2018.*
`
}

// ── 2. Software Design Document (SDD) ─────────────────────────────────────────
export function generateSDD(
  doc: ArchitectureDoc,
  requirements: RequirementsDoc | null,
): string {
  const fileTree = doc.fileTree?.length
    ? doc.fileTree.map((f) => `| \`${f.path}\` | ${f.description} |`).join('\n')
    : '| _No files defined_ | |'

  const components = doc.components?.length
    ? doc.components.map((c) => `### ${c.name}\n- **Type:** ${c.type}\n- **Purpose:** ${c.purpose}`).join('\n\n')
    : '_No components defined._'

  return `# Software Design Document (SDD)

**Project:** ${doc.projectName}
**Document Version:** 1.0
**Date:** ${today()}
**Prepared by:** Code Genesis

---

## 1. Introduction

### 1.1 Purpose
This document describes the software architecture and design for **${doc.projectName}**, translating the requirements into a concrete technical blueprint.

### 1.2 System Summary
${doc.summary}

---

## 2. System Architecture

### 2.1 Technology Stack
${doc.techStack.map((t) => `- ${t}`).join('\n')}

### 2.2 Data Flow
${doc.dataFlow}

---

## 3. File Structure

The system is composed of approximately **${doc.estimatedFiles}** source files:

| File | Responsibility |
|------|----------------|
${fileTree}

---

## 4. Component Design

${components}

---

## 5. Traceability

${requirements?.coreFeatures?.length
      ? `This design satisfies the following requirements:\n\n${requirements.coreFeatures.map((f) => `- ${f}`).join('\n')}`
      : '_Requirements traceability not available._'}

---

*Generated by Code Genesis — AI-Powered SDLC IDE*
`
}

// ── 3. Implementation / Technical Documentation ───────────────────────────────
export function generateImplementationDoc(
  files: ProjectFile[],
  doc: ArchitectureDoc | null,
  projectName: string,
): string {
  const byDir = new Map<string, ProjectFile[]>()
  for (const f of files) {
    const dir = f.path.includes('/') ? f.path.split('/').slice(0, -1).join('/') : '(root)'
    if (!byDir.has(dir)) byDir.set(dir, [])
    byDir.get(dir)!.push(f)
  }

  const fileSections = Array.from(byDir.entries())
    .map(([dir, fs]) => {
      const rows = fs.map((f) => {
        const lines = f.content.split('\n').length
        return `| \`${f.path.split('/').pop()}\` | ${f.language} | ${lines} lines |`
      }).join('\n')
      return `### \`${dir}/\`\n\n| File | Language | Size |\n|------|----------|------|\n${rows}`
    })
    .join('\n\n')

  return `# Implementation Documentation

**Project:** ${projectName}
**Document Version:** 1.0
**Date:** ${today()}
**Prepared by:** Code Genesis

---

## 1. Overview
${doc?.summary ?? `Technical implementation documentation for ${projectName}.`}

This document catalogs the source files produced during the implementation phase.

---

## 2. Project Statistics

- **Total files:** ${files.length}
- **Total lines of code:** ${files.reduce((sum, f) => sum + f.content.split('\n').length, 0)}
- **Tech stack:** ${doc?.techStack?.join(', ') ?? 'Next.js, TypeScript, Tailwind CSS'}

---

## 3. Source File Index

${fileSections || '_No files generated yet._'}

---

## 4. Build & Run

\`\`\`bash
npm install      # install dependencies
npm run dev      # start the development server (http://localhost:3001)
npm run build    # create a production build
\`\`\`

---

*Generated by Code Genesis — AI-Powered SDLC IDE*
`
}

// ── Browser download helper ───────────────────────────────────────────────────
export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
