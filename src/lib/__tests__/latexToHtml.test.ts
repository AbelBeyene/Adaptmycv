import { describe, it, expect } from 'vitest'
import { latexToHtml } from '../latexToHtml'
import template from '../../../template_ATS_resume.tex?raw'

const doc = (body: string) => `\\documentclass{article}\n\\usepackage{x}\n\\begin{document}\n${body}\n\\end{document}`

describe('latexToHtml', () => {
  it('ignores the preamble and renders sections, bold and italics', () => {
    const html = latexToHtml(doc('\\section*{Work Experience}\n\\textbf{Lead} at \\textit{Acme}'))
    expect(html).not.toContain('usepackage')
    expect(html).toContain('<h2>Work Experience</h2>')
    expect(html).toContain('<strong>Lead</strong> at <em>Acme</em>')
  })

  it('renders \\job as two rows with title/dates and company/place', () => {
    const html = latexToHtml(doc('\\job{Engineer}{03/2021 -- Present}{Acme GmbH}{Berlin}'))
    expect(html).toBe(
      '<div class="rs-row"><strong>Engineer</strong><span>03/2021 – Present</span></div>' +
        '<div class="rs-row"><em>Acme GmbH</em><span>Berlin</span></div>'
    )
  })

  it('renders itemize as a list', () => {
    const html = latexToHtml(doc('\\begin{itemize}\n  \\item One\n  \\item Two\n\\end{itemize}'))
    expect(html).toMatch(/^<ul>\s*<li>One\s*<li>Two\s*<\/ul>$/)
  })

  it('unescapes LaTeX specials and handles line breaks, textbar and comments', () => {
    const html = latexToHtml(doc('R\\&D \\textbar\\ 40\\% C\\# a\\_b\\\\next % comment\nline'))
    expect(html).toBe('R&amp;D | 40% C# a_b<br>next line')
  })

  it('keeps nested commands inside links and only allows safe URLs', () => {
    expect(latexToHtml(doc('\\href{https://github.com/a\\_b}{\\textbf{gh}}'))).toBe(
      '<a href="https://github.com/a_b" target="_blank" rel="noreferrer"><strong>gh</strong></a>'
    )
    expect(latexToHtml(doc('\\href{javascript:alert(1)}{x}'))).toBe('x')
  })

  it('escapes HTML in content so model output cannot inject markup', () => {
    const html = latexToHtml(doc('<img src=x onerror=alert(1)> \\textbf{<b>"}'))
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('<strong>&lt;b&gt;&quot;</strong>')
  })

  it('scopes size commands to their group and drops layout-only arguments', () => {
    const html = latexToHtml(doc('{\\LARGE \\textbf{Jane Doe}} \\vspace{0.25em}after'))
    expect(html).toBe('<span class="rs-name"><strong>Jane Doe</strong></span> after')
  })

  it('renders the full ATS template without leaking LaTeX syntax', () => {
    const html = latexToHtml(template)
    expect(html).toContain('<h2>Professional Summary</h2>')
    expect(html).toContain('<h2>Languages</h2>')
    expect(html).toContain('<strong>[Full Name]</strong>')
    expect(html).not.toMatch(/\\[a-zA-Z]|textwidth|minipage|profile\.jpg/)
  })
})
