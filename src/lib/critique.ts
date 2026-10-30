export interface CritiqueFinding {
  quote: string      // verbatim text from the resume; "" if missing or the model's quote could not be verified
  issue: string      // what's wrong
  suggestion: string // why / how to fix it
  rewrite: string    // ready-to-paste replacement text; "" if not applicable
}

export interface ResumeDocSection {
  key: string
  title: string
  score: number      // 0-10
  status: 'pass' | 'warn' | 'fail'
  missing: boolean   // section absent from the resume
  findings: CritiqueFinding[]
}

export interface ResumeCritique {
  overallScore: number     // derived from section scores, 0-100
  resumeMarkdown: string   // full resume rendered as clean Markdown for display
  sections: ResumeDocSection[]
  topRedFlags: string[]
  quickWins: string[]
  metrics: { clarity: number | null; impact: number | null } // 0-100
  missingKeywords: string[] // only when a job description was supplied
}

export const MAX_FINDINGS_PER_SECTION = 3

// Lowercase, drop markdown emphasis/bullets and collapse whitespace so PDF line breaks don't break matching.
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[*_`•]/g, '').replace(/\s+/g, ' ').trim()
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function strList(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.map(str).filter(Boolean).slice(0, max) : []
}

function clamp(value: unknown, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n))) : null
}

export function statusFor(score: number): ResumeDocSection['status'] {
  return score >= 7 ? 'pass' : score >= 4 ? 'warn' : 'fail'
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'
}

/**
 * Turns the model's raw JSON into a trustworthy critique: drops quotes that aren't in the resume,
 * derives status and the overall score from section scores, and fills safe defaults.
 */
export function normalizeCritique(raw: unknown, resumeText: string): ResumeCritique {
  const r = (raw ?? {}) as Record<string, unknown>
  const resumeMarkdown = str(r.resumeMarkdown)
  if (!resumeMarkdown || !Array.isArray(r.sections)) {
    throw new Error('Invalid critique response structure from API')
  }

  const haystack = normalizeForMatch(`${resumeText}\n${resumeMarkdown}`)
  const seenKeys = new Set<string>()

  const sections: ResumeDocSection[] = r.sections
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => {
      const title = str(s.title) || str(s.key) || 'Section'
      let key = slug(str(s.key) || title)
      while (seenKeys.has(key)) key += '-2'
      seenKeys.add(key)

      const score = clamp(s.score, 10) ?? 0
      const findings = (Array.isArray(s.findings) ? s.findings : [])
        .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
        .map((f) => {
          const quote = str(f.quote).replace(/^["“]|["”]$/g, '')
          const norm = normalizeForMatch(quote)
          return {
            quote: norm.length > 3 && haystack.includes(norm) ? quote : '',
            issue: str(f.issue),
            suggestion: str(f.suggestion),
            rewrite: str(f.rewrite),
          }
        })
        .filter((f) => f.issue || f.suggestion)
        .slice(0, MAX_FINDINGS_PER_SECTION)

      return { key, title, score, status: statusFor(score), missing: s.missing === true, findings }
    })

  if (!sections.length) throw new Error('Critique returned no sections')

  const avg = sections.reduce((sum, s) => sum + s.score, 0) / sections.length
  const metrics = (r.metrics ?? {}) as Record<string, unknown>

  return {
    overallScore: Math.round(avg * 10),
    resumeMarkdown,
    sections,
    topRedFlags: strList(r.topRedFlags, 3),
    quickWins: strList(r.quickWins, 3),
    metrics: { clarity: clamp(metrics.clarity, 100), impact: clamp(metrics.impact, 100) },
    missingKeywords: strList(r.missingKeywords, 12),
  }
}
