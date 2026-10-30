import { describe, it, expect } from 'vitest'
import { normalizeCritique } from '../critique'

const resumeText = `Jane Doe
Responsible for managing the
team and   various tasks
Skills: React, TypeScript`

const raw = {
  overallScore: 99, // ignored: derived from section scores
  resumeMarkdown: '# Jane Doe\n## Experience\n- Responsible for managing the team and various tasks',
  sections: [
    {
      key: 'experience', title: 'Experience', score: 3, status: 'pass',
      findings: [
        { quote: 'Responsible for managing the team', issue: 'Duty, not result', suggestion: 'Show outcome', rewrite: 'Led a team of [N]' },
        { quote: 'Invented quote not in resume', issue: 'x', suggestion: 'y' },
        { quote: '', issue: '', suggestion: '' },
      ],
    },
    { key: 'experience', title: 'Summary', score: 14, missing: true, findings: 'bad' },
    null,
  ],
  metrics: { clarity: '72', impact: 'n/a' },
  topRedFlags: ['a', 2, 'b', 'c', 'd'],
}

describe('normalizeCritique', () => {
  const c = normalizeCritique(raw, resumeText)

  it('keeps quotes that match across line breaks and drops invented ones', () => {
    const [real, invented] = c.sections[0].findings
    expect(real.quote).toBe('Responsible for managing the team')
    expect(invented.quote).toBe('')
    expect(c.sections[0].findings).toHaveLength(2) // empty finding removed
  })

  it('derives status and overall score from clamped section scores', () => {
    expect(c.sections.map((s) => [s.score, s.status])).toEqual([[3, 'fail'], [10, 'pass']])
    expect(c.overallScore).toBe(65)
  })

  it('dedupes keys and fills safe defaults', () => {
    expect(c.sections.map((s) => s.key)).toEqual(['experience', 'experience-2'])
    expect(c.sections[1]).toMatchObject({ missing: true, findings: [] })
    expect(c.metrics).toEqual({ clarity: 72, impact: null })
    expect(c.topRedFlags).toEqual(['a', 'b', 'c'])
    expect(c.quickWins).toEqual([])
    expect(c.missingKeywords).toEqual([])
  })

  it('rejects responses without markdown or sections', () => {
    expect(() => normalizeCritique({ sections: [] }, resumeText)).toThrow()
    expect(() => normalizeCritique({ resumeMarkdown: '# x', sections: [] }, resumeText)).toThrow()
  })
})
