import { describe, it, expect } from 'vitest'
import {
  escapeRegex,
  extractSectionContent,
  parseResumeSections,
  replaceSectionContent,
  rebuildLatexFromSections,
  allSectionsEmpty,
  EMPTY_SECTIONS,
  SECTION_ORDER,
  type ResumeSections,
} from '../resumeSections'

// ---------------------------------------------------------------------------
// Minimal LaTeX fixtures
// ---------------------------------------------------------------------------

const makeLatex = (sections: Array<{ title: string; content: string }>, starred = true): string => {
  const cmd = starred ? '\\section*' : '\\section'
  const body = sections
    .map(({ title, content }) => `${cmd}{${title}}\n${content}\n\n`)
    .join('')
  return `\\documentclass{article}\n\\begin{document}\n${body}\\end{document}`
}

const FULL_STARRED = makeLatex(
  [
    { title: 'Professional Summary', content: 'Experienced engineer.' },
    { title: 'Education', content: 'BSc Computer Science.' },
    { title: 'Technical Skills', content: 'TypeScript, React, Node.' },
    { title: 'Work Experience', content: '3 years at Acme Corp.' },
    { title: 'Projects', content: 'Built an ATS tool.' },
    { title: 'Languages', content: 'English, French.' },
  ],
  true
)

const FULL_UNSTARRED = makeLatex(
  [
    { title: 'Professional Summary', content: 'Experienced engineer.' },
    { title: 'Education', content: 'BSc Computer Science.' },
    { title: 'Technical Skills', content: 'TypeScript, React, Node.' },
    { title: 'Work Experience', content: '3 years at Acme Corp.' },
    { title: 'Projects', content: 'Built an ATS tool.' },
    { title: 'Languages', content: 'English, French.' },
  ],
  false
)

const MIXED_LATEX = `\\documentclass{article}
\\begin{document}
\\section*{Professional Summary}
Experienced engineer.

\\section{Education}
BSc Computer Science.

\\section*{Technical Skills}
TypeScript, React.

\\end{document}`

// ---------------------------------------------------------------------------
// escapeRegex
// ---------------------------------------------------------------------------

describe('escapeRegex', () => {
  it('escapes dot, star, plus, parens, braces, brackets, caret, dollar, pipe, backslash, question mark', () => {
    expect(escapeRegex('.*+?^${}()|[\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\\\')
  })

  it('leaves plain alphanumeric unchanged', () => {
    expect(escapeRegex('Professional Summary')).toBe('Professional Summary')
  })
})

// ---------------------------------------------------------------------------
// extractSectionContent
// ---------------------------------------------------------------------------

describe('extractSectionContent', () => {
  it('extracts content with starred sections (\\section*)', () => {
    const content = extractSectionContent(FULL_STARRED, 'Professional Summary', [
      'Education',
      'Technical Skills',
      'Work Experience',
      'Projects',
      'Languages',
    ])
    expect(content).toBe('Experienced engineer.')
  })

  it('extracts content with unstarred sections (\\section)', () => {
    const content = extractSectionContent(FULL_UNSTARRED, 'Work Experience', ['Projects', 'Languages'])
    expect(content).toBe('3 years at Acme Corp.')
  })

  it('extracts content from a mixed starred/unstarred document', () => {
    const edu = extractSectionContent(MIXED_LATEX, 'Education', [
      'Technical Skills',
      'Work Experience',
      'Projects',
      'Languages',
    ])
    expect(edu).toBe('BSc Computer Science.')
  })

  it('extracts the last section (boundary is \\end{document})', () => {
    const lang = extractSectionContent(FULL_STARRED, 'Languages', [])
    expect(lang).toBe('English, French.')
  })

  it('returns empty string when section does not exist', () => {
    const missing = extractSectionContent(FULL_STARRED, 'Certifications', [])
    expect(missing).toBe('')
  })

  it('returns empty string for empty latex', () => {
    expect(extractSectionContent('', 'Professional Summary', [])).toBe('')
  })

  it('handles multi-line section content', () => {
    const latex = makeLatex([
      { title: 'Work Experience', content: 'Line 1\nLine 2\nLine 3' },
      { title: 'Projects', content: 'Some project.' },
    ])
    const content = extractSectionContent(latex, 'Work Experience', ['Projects'])
    expect(content).toContain('Line 1')
    expect(content).toContain('Line 2')
    expect(content).toContain('Line 3')
  })
})

// ---------------------------------------------------------------------------
// parseResumeSections
// ---------------------------------------------------------------------------

describe('parseResumeSections', () => {
  it('parses all sections from a fully-starred document', () => {
    const sections = parseResumeSections(FULL_STARRED)
    expect(sections.professionalSummary).toBe('Experienced engineer.')
    expect(sections.education).toBe('BSc Computer Science.')
    expect(sections.technicalSkills).toBe('TypeScript, React, Node.')
    expect(sections.workExperience).toBe('3 years at Acme Corp.')
    expect(sections.projects).toBe('Built an ATS tool.')
    expect(sections.languages).toBe('English, French.')
  })

  it('parses all sections from a fully-unstarred document', () => {
    const sections = parseResumeSections(FULL_UNSTARRED)
    expect(sections.professionalSummary).toBe('Experienced engineer.')
    expect(sections.workExperience).toBe('3 years at Acme Corp.')
    expect(sections.languages).toBe('English, French.')
  })

  it('parses sections from a mixed starred/unstarred document', () => {
    const sections = parseResumeSections(MIXED_LATEX)
    expect(sections.professionalSummary).toBe('Experienced engineer.')
    expect(sections.education).toBe('BSc Computer Science.')
    expect(sections.technicalSkills).toBe('TypeScript, React.')
  })

  it('returns empty strings for all sections when none match', () => {
    const sections = parseResumeSections('\\documentclass{article}\\begin{document}Hello\\end{document}')
    expect(sections).toEqual(EMPTY_SECTIONS)
  })

  it('returns empty strings for sections not present in the document', () => {
    const latex = makeLatex([{ title: 'Professional Summary', content: 'Summary text.' }])
    const sections = parseResumeSections(latex)
    expect(sections.professionalSummary).toBe('Summary text.')
    expect(sections.education).toBe('')
    expect(sections.technicalSkills).toBe('')
  })

  it('always returns an object with all expected keys', () => {
    const sections = parseResumeSections('')
    const keys = Object.keys(sections).sort()
    const expected = Object.keys(EMPTY_SECTIONS).sort()
    expect(keys).toEqual(expected)
  })
})

// ---------------------------------------------------------------------------
// replaceSectionContent
// ---------------------------------------------------------------------------

describe('replaceSectionContent', () => {
  it('replaces content in a starred section', () => {
    const updated = replaceSectionContent(
      FULL_STARRED,
      'Professional Summary',
      'New summary content.',
      SECTION_ORDER.slice(1).map((s) => s.title)
    )
    const reparsed = parseResumeSections(updated)
    expect(reparsed.professionalSummary).toBe('New summary content.')
    // Other sections must be preserved
    expect(reparsed.education).toBe('BSc Computer Science.')
  })

  it('replaces content in an unstarred section', () => {
    const updated = replaceSectionContent(
      FULL_UNSTARRED,
      'Work Experience',
      'Updated work history.',
      ['Projects', 'Languages']
    )
    const reparsed = parseResumeSections(updated)
    expect(reparsed.workExperience).toBe('Updated work history.')
    expect(reparsed.projects).toBe('Built an ATS tool.')
  })

  it('returns the original string unmodified when section does not exist', () => {
    const result = replaceSectionContent(FULL_STARRED, 'Certifications', 'Some cert.', [])
    expect(result).toBe(FULL_STARRED)
  })

  it('handles empty replacement content', () => {
    const updated = replaceSectionContent(
      FULL_STARRED,
      'Languages',
      '',
      []
    )
    const reparsed = parseResumeSections(updated)
    expect(reparsed.languages).toBe('')
    expect(reparsed.projects).toBe('Built an ATS tool.')
  })
})

// ---------------------------------------------------------------------------
// rebuildLatexFromSections — round-trip integrity
// ---------------------------------------------------------------------------

describe('rebuildLatexFromSections', () => {
  it('round-trips: parse then rebuild produces equivalent section content', () => {
    const parsed = parseResumeSections(FULL_STARRED)
    const rebuilt = rebuildLatexFromSections(FULL_STARRED, parsed)
    const reparsed = parseResumeSections(rebuilt)

    for (const { key } of SECTION_ORDER) {
      expect(reparsed[key]).toBe(parsed[key])
    }
  })

  it('round-trips on unstarred document', () => {
    const parsed = parseResumeSections(FULL_UNSTARRED)
    const rebuilt = rebuildLatexFromSections(FULL_UNSTARRED, parsed)
    const reparsed = parseResumeSections(rebuilt)

    for (const { key } of SECTION_ORDER) {
      expect(reparsed[key]).toBe(parsed[key])
    }
  })

  it('applies a single section edit and preserves others', () => {
    const parsed = parseResumeSections(FULL_STARRED)
    const modified: ResumeSections = { ...parsed, workExperience: 'New company, 5 years.' }
    const rebuilt = rebuildLatexFromSections(FULL_STARRED, modified)
    const reparsed = parseResumeSections(rebuilt)

    expect(reparsed.workExperience).toBe('New company, 5 years.')
    expect(reparsed.professionalSummary).toBe(parsed.professionalSummary)
    expect(reparsed.education).toBe(parsed.education)
    expect(reparsed.technicalSkills).toBe(parsed.technicalSkills)
    expect(reparsed.projects).toBe(parsed.projects)
    expect(reparsed.languages).toBe(parsed.languages)
  })
})

// ---------------------------------------------------------------------------
// allSectionsEmpty
// ---------------------------------------------------------------------------

describe('allSectionsEmpty', () => {
  it('returns true when all sections are empty strings', () => {
    expect(allSectionsEmpty(EMPTY_SECTIONS)).toBe(true)
  })

  it('returns true when all sections are whitespace-only', () => {
    const ws: ResumeSections = {
      professionalSummary: '   ',
      education: '\t',
      technicalSkills: '\n',
      workExperience: '',
      projects: '  ',
      languages: '',
    }
    expect(allSectionsEmpty(ws)).toBe(true)
  })

  it('returns false when at least one section has content', () => {
    const partial: ResumeSections = { ...EMPTY_SECTIONS, education: 'BSc CS' }
    expect(allSectionsEmpty(partial)).toBe(false)
  })

  it('returns false for a fully-populated sections object', () => {
    const sections = parseResumeSections(FULL_STARRED)
    expect(allSectionsEmpty(sections)).toBe(false)
  })
})
