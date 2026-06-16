import { describe, it, expect } from 'vitest'
import { extractLatexFromResponse } from '../latexParser'

const MINIMAL_DOC = `\\documentclass{article}\n\\begin{document}\nHello world.\n\\end{document}`

describe('extractLatexFromResponse', () => {
  it('extracts LaTeX from well-formed <latex> tags', () => {
    const response = `<summary>Tailored resume.</summary>\n<warnings>[]</warnings>\n<latex>\n${MINIMAL_DOC}\n</latex>`
    expect(extractLatexFromResponse(response)).toBe(MINIMAL_DOC)
  })

  it('extracts LaTeX from <latex> tags with extra whitespace', () => {
    const response = `<latex>   \n${MINIMAL_DOC}\n   </latex>`
    expect(extractLatexFromResponse(response)).toBe(MINIMAL_DOC)
  })

  it('extracts LaTeX from case-insensitive <LaTeX> tags', () => {
    const response = `<LaTeX>\n${MINIMAL_DOC}\n</LaTeX>`
    expect(extractLatexFromResponse(response)).toBe(MINIMAL_DOC)
  })

  it('strips outer markdown XML fence and extracts from <latex> tag', () => {
    const response = '```xml\n<latex>\n' + MINIMAL_DOC + '\n</latex>\n```'
    expect(extractLatexFromResponse(response)).toBe(MINIMAL_DOC)
  })

  it('strips outer markdown code fence (no language) and extracts', () => {
    const response = '```\n<latex>\n' + MINIMAL_DOC + '\n</latex>\n```'
    expect(extractLatexFromResponse(response)).toBe(MINIMAL_DOC)
  })

  it('falls back to raw LaTeX when no <latex> tags are present', () => {
    const response = `Here is your resume:\n\n${MINIMAL_DOC}\n\nHope this helps.`
    expect(extractLatexFromResponse(response)).toBe(MINIMAL_DOC)
  })

  it('falls back to raw LaTeX when LLM outputs just the document', () => {
    expect(extractLatexFromResponse(MINIMAL_DOC)).toBe(MINIMAL_DOC)
  })

  it('returns null when response is empty', () => {
    expect(extractLatexFromResponse('')).toBeNull()
  })

  it('returns null when response contains no \\documentclass', () => {
    expect(extractLatexFromResponse('Some random text without LaTeX.')).toBeNull()
  })

  it('returns null when response has \\documentclass but no \\end{document}', () => {
    expect(extractLatexFromResponse('\\documentclass{article}\n\\begin{document}\nincomplete')).toBeNull()
  })

  it('returns null when <latex> tag is present but content has no \\documentclass', () => {
    const response = '<latex>\njust some text without document class\n</latex>'
    expect(extractLatexFromResponse(response)).toBeNull()
  })

  it('handles LaTeX inside a latex fence (```latex ... ```) within the xml tag', () => {
    const inner = '```latex\n' + MINIMAL_DOC + '\n```'
    const response = '<summary>x</summary><warnings>[]</warnings><latex>\n' + inner + '\n</latex>'
    // The outer tag content does not include \documentclass directly — fallback to raw search
    const result = extractLatexFromResponse(response)
    // Should find via the raw fallback path since \documentclass is in the string
    expect(result).toBe(MINIMAL_DOC)
  })

  it('preserves the full document including preamble and body', () => {
    const richDoc = [
      '\\documentclass[a4paper,11pt]{article}',
      '\\usepackage{geometry}',
      '\\begin{document}',
      '\\section*{Work Experience}',
      'Engineer at Company.',
      '\\end{document}',
    ].join('\n')

    const response = `<latex>\n${richDoc}\n</latex>`
    expect(extractLatexFromResponse(response)).toBe(richDoc)
  })
})
