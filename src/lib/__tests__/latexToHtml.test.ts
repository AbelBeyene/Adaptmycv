import { describe, it, expect } from 'vitest'
import { escapeLatex, latexToHtml, replaceTextRun } from '../latexToHtml'
import template from '../../../template_ATS_resume.tex?raw'

const doc = (body: string) => `\\documentclass{article}\n\\usepackage{x}\n\\begin{document}\n${body}\n\\end{document}`
// Structure checks ignore the source-range spans around text runs
const render = (latex: string) => latexToHtml(latex).replace(/<span data-s="\d+" data-e="\d+">([^<]*)<\/span>/g, '$1')

// Simulates typing into the preview: find the run showing `from`, replace it with `to`, write it back
function editRun(latex: string, from: string, to: string): string {
  const runs = [...latexToHtml(latex).matchAll(/<span data-s="(\d+)" data-e="(\d+)">([^<]*)<\/span>/g)]
  const run = runs.find((m) => m[3].includes(from.replace(/&/g, '&amp;')))
  if (!run) throw new Error(`no text run containing "${from}"`)
  // what the browser's textContent would give for the span
  const shown = run[3].replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  return replaceTextRun(latex, Number(run[1]), Number(run[2]), shown.replace(from, to))
}

describe('latexToHtml', () => {
  it('ignores the preamble and renders sections, bold and italics', () => {
    const html = render(doc('\\section*{Work Experience}\n\\textbf{Lead} at \\textit{Acme}'))
    expect(html).not.toContain('usepackage')
    expect(html).toContain('<h2>Work Experience</h2>')
    expect(html).toContain('<strong>Lead</strong> at <em>Acme</em>')
  })

  it('renders \\job as two rows with title/dates and company/place', () => {
    expect(render(doc('\\job{Engineer}{03/2021 -- Present}{Acme GmbH}{Berlin}'))).toBe(
      '<div class="rs-row"><strong>Engineer</strong><span>03/2021 – Present</span></div>' +
        '<div class="rs-row"><em>Acme GmbH</em><span>Berlin</span></div>'
    )
  })

  it('renders itemize as a list', () => {
    expect(render(doc('\\begin{itemize}\n  \\item One\n  \\item Two\n\\end{itemize}'))).toMatch(
      /^<ul>\s*<li>One\s*<li>Two\s*<\/ul>$/
    )
  })

  it('unescapes LaTeX specials and handles line breaks, textbar and comments', () => {
    expect(render(doc('R\\&D \\textbar\\ 40\\% C\\# a\\_b\\\\next % comment\nline'))).toBe(
      'R&amp;D | 40% C# a_b<br>next line'
    )
  })

  it('keeps nested commands inside links and only allows safe URLs', () => {
    expect(render(doc('\\href{https://github.com/a\\_b}{\\textbf{gh}}'))).toBe(
      '<a href="https://github.com/a_b" target="_blank" rel="noreferrer"><strong>gh</strong></a>'
    )
    expect(render(doc('\\href{javascript:alert(1)}{x}'))).toBe('x')
  })

  it('escapes HTML in content so model output cannot inject markup', () => {
    const html = latexToHtml(doc('<img src=x onerror=alert(1)> \\textbf{<b>"}'))
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;b&gt;&quot;')
  })

  it('scopes size commands to their group and drops layout-only arguments', () => {
    expect(render(doc('{\\LARGE \\textbf{Jane Doe}} \\vspace{0.25em}after'))).toBe(
      '<span class="rs-name"><strong>Jane Doe</strong></span> after'
    )
  })

  it('renders the full ATS template without leaking LaTeX syntax', () => {
    const html = render(template)
    expect(html).toContain('<h2>Professional Summary</h2>')
    expect(html).toContain('<h2>Languages</h2>')
    expect(html).toContain('<strong>[Full Name]</strong>')
    expect(html).not.toMatch(/\\[a-zA-Z]|textwidth|minipage|profile\.jpg/)
  })

  it('marks text runs editable only when asked', () => {
    expect(latexToHtml(doc('Hello'))).not.toContain('contenteditable')
    expect(latexToHtml(doc('Hello'), { editable: true })).toContain('contenteditable="plaintext-only"')
  })
})

describe('editing text in the preview', () => {
  it('writes an edit back into the right place, leaving commands intact', () => {
    const latex = doc('\\section*{Summary}\nBuilt \\textbf{React} apps for 5 teams.')
    const edited = editRun(latex, 'apps for 5 teams.', 'apps for 7 teams.')
    expect(edited).toBe(doc('\\section*{Summary}\nBuilt \\textbf{React} apps for 7 teams.'))
  })

  it('edits text inside command arguments such as \\job and \\textbf', () => {
    const latex = doc('\\job{Engineer}{2021 -- Present}{Acme GmbH}{Berlin}')
    expect(editRun(latex, 'Acme GmbH', 'Acme AG')).toBe(doc('\\job{Engineer}{2021 -- Present}{Acme AG}{Berlin}'))
  })

  it('escapes LaTeX specials typed by the user', () => {
    const latex = doc('\\begin{itemize}\n  \\item Cut costs\n\\end{itemize}')
    const edited = editRun(latex, 'Cut costs', 'Cut R&D costs 20% (#1, a_b, {x}, ~, ^, \\)')
    expect(edited).toContain('\\item Cut R\\&D costs 20\\% (\\#1, a\\_b, \\{x\\}, \\textasciitilde{}, \\textasciicircum{}, \\textbackslash{})')
    expect(render(edited)).toContain('Cut R&amp;D costs 20% (#1, a_b, {x}, ~, ^, \\)')
  })

  it('keeps escaped symbols in one run and round-trips them', () => {
    const latex = doc('Grew revenue 40\\% \\& cut churn')
    expect(editRun(latex, 'Grew', 'Doubled')).toBe(doc('Doubled revenue 40\\% \\& cut churn'))
  })

  it('escapeLatex leaves plain text alone', () => {
    expect(escapeLatex('Senior Engineer – Berlin')).toBe('Senior Engineer – Berlin')
  })
})
