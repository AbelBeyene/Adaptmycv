export type ResumeSections = {
  professionalSummary: string
  education: string
  technicalSkills: string
  workExperience: string
  projects: string
  languages: string
}

export const SECTION_ORDER: Array<{ key: keyof ResumeSections; title: string }> = [
  { key: 'professionalSummary', title: 'Professional Summary' },
  { key: 'education', title: 'Education' },
  { key: 'technicalSkills', title: 'Technical Skills' },
  { key: 'workExperience', title: 'Work Experience' },
  { key: 'projects', title: 'Projects' },
  { key: 'languages', title: 'Languages' },
]

export const EMPTY_SECTIONS: ResumeSections = {
  professionalSummary: '',
  education: '',
  technicalSkills: '',
  workExperience: '',
  projects: '',
  languages: '',
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Matches \section{Title} OR \section*{Title} — the asterisk is optional.
function sectionPattern(title: string): string {
  return `\\\\section\\*?\\{${escapeRegex(title)}\\}`
}

export function extractSectionContent(latex: string, title: string, nextTitles: string[]): string {
  const nextPatterns = nextTitles.map(sectionPattern)
  const boundary =
    nextPatterns.length > 0
      ? `(?=${nextPatterns.join('|')}|\\\\end\\{document\\})`
      : `(?=\\\\end\\{document\\})`

  const pattern = new RegExp(`${sectionPattern(title)}([\\s\\S]*?)${boundary}`)
  const match = latex.match(pattern)
  return match?.[1]?.trim() ?? ''
}

export function parseResumeSections(latex: string): ResumeSections {
  const sections = { ...EMPTY_SECTIONS }

  SECTION_ORDER.forEach((section, index) => {
    const nextTitles = SECTION_ORDER.slice(index + 1).map((s) => s.title)
    sections[section.key] = extractSectionContent(latex, section.title, nextTitles)
  })

  return sections
}

export function replaceSectionContent(
  latex: string,
  title: string,
  newContent: string,
  nextTitles: string[]
): string {
  const nextPatterns = nextTitles.map(sectionPattern)
  const boundary =
    nextPatterns.length > 0
      ? `(?=${nextPatterns.join('|')}|\\\\end\\{document\\})`
      : `(?=\\\\end\\{document\\})`

  const pattern = new RegExp(`(${sectionPattern(title)})([\\s\\S]*?)${boundary}`)
  const normalizedContent = newContent.trim()
  return latex.replace(pattern, (_, header: string) => {
    return `${header}\n${normalizedContent ? `${normalizedContent}\n\n` : '\n'}`
  })
}

export function rebuildLatexFromSections(latex: string, sections: ResumeSections): string {
  return SECTION_ORDER.reduce((current, section, index) => {
    const nextTitles = SECTION_ORDER.slice(index + 1).map((s) => s.title)
    return replaceSectionContent(current, section.title, sections[section.key], nextTitles)
  }, latex)
}

export function allSectionsEmpty(sections: ResumeSections): boolean {
  return Object.values(sections).every((v) => !v.trim())
}
