// Renders the subset of LaTeX used by template_ATS_resume.tex as HTML, so the preview needs no
// network compile. Unknown commands are dropped but their {arguments} still render as text.
// shortcut: no math, tables or custom macros beyond \job; upgrade to a WASM TeX engine if exact typesetting matters.
//
// Every plain-text run is wrapped in <span data-s data-e> holding its source range, so an edit made in
// the preview can be written back into the LaTeX with replaceTextRun().

const SIZE_CLASS: Record<string, string> = { LARGE: 'rs-name', Large: 'rs-lg', large: 'rs-lg', huge: 'rs-name', Huge: 'rs-name' }

// Commands whose arguments are layout-only and must not show up as text
const SKIP_ARGS: Record<string, number> = {
  vspace: 1, 'vspace*': 1, hspace: 1, 'hspace*': 1, selectlanguage: 1, setlength: 2, addtolength: 2,
  pagestyle: 1, thispagestyle: 1, includegraphics: 1, fontsize: 2, setmainfont: 1, color: 1,
}

const LATEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', $: '\\$', '#': '\\#', _: '\\_', '{': '\\{', '}': '\\}',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}', '\u00a0': '~', '\n': ' ',
}

const CMD = /[a-zA-Z]+\*?/y
// Escapes escapeLatex() writes; rendered as text so an edited run stays one editable span
const TEXT_CMD = /(textasciitilde|textasciicircum|textbackslash)(\{\})?/y
const TEXT_CMD_CHAR: Record<string, string> = { textasciitilde: '~', textasciicircum: '^', textbackslash: '\\' }
const BLANK_LINE = /\n[ \t]*\n\s*/y

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function link(rawUrl: string, html: string): string {
  const url = rawUrl.trim().replace(/\\([&%#_$~])/g, '$1')
  return /^(https?:|mailto:)/i.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${html}</a>` : html
}

export function escapeLatex(text: string): string {
  return text.replace(/[\\&%$#_{}~^\u00a0\n]/g, (ch) => LATEX_ESCAPES[ch])
}

/** Replaces the source range of one rendered text run with new plain text, escaped for LaTeX. */
export function replaceTextRun(latex: string, start: number, end: number, text: string): string {
  return latex.slice(0, start) + escapeLatex(text) + latex.slice(end)
}

export function latexToHtml(src: string, { editable = false } = {}): string {
  const editAttr = editable ? ' contenteditable="plaintext-only"' : ''

  function convert(from: number, to: number): string {
    let i = from
    let out = ''
    let openSpans = 0
    let run = ''
    let runStart = -1
    let runEnd = -1
    let pendingSpace = '' // whitespace is only pulled into a run once more text follows, so runs never start or end with it

    // Records text rendered from source range [start, end)
    const text = (html: string, start: number, end: number) => {
      if (html === ' ') {
        pendingSpace += ' '
        return
      }
      if (runStart < 0) {
        out += pendingSpace
        runStart = start
      } else run += pendingSpace
      pendingSpace = ''
      run += html
      runEnd = end
    }
    const flush = () => {
      if (runStart >= 0) out += `<span data-s="${runStart}" data-e="${runEnd}"${editAttr}>${run}</span>`
      out += pendingSpace
      run = ''
      pendingSpace = ''
      runStart = -1
    }
    const skipOpt = () => {
      if (src[i] !== '[') return
      const close = src.indexOf(']', i)
      i = close < 0 || close >= to ? to : close + 1
    }
    // Reads the next {group} (skipping whitespace and [options]); returns null and leaves i alone if there is none
    const readGroup = (): [number, number] | null => {
      const saved = i
      while (i < to && (/\s/.test(src[i]) || src[i] === '[')) {
        if (src[i] === '[') skipOpt()
        else i++
      }
      if (i >= to || src[i] !== '{') {
        i = saved
        return null
      }
      const start = i + 1
      let depth = 0
      for (; i < to; i++) {
        if (src[i] === '\\') i++
        else if (src[i] === '{') depth++
        else if (src[i] === '}' && --depth === 0) return [start, i++]
      }
      return [start, to]
    }
    const arg = () => {
      const g = readGroup()
      return g ? convert(g[0], g[1]) : ''
    }
    const raw = () => {
      const g = readGroup()
      return g ? src.slice(g[0], g[1]) : ''
    }

    while (i < to) {
      const c = src[i]
      const start = i

      if (c === '\\') {
        const next = src[i + 1] ?? ''
        if (next && '&%#$_{}'.includes(next)) {
          i += 2
          text(esc(next), start, i)
          continue
        }
        if (next === ' ' || next === ',' || next === ';') {
          i += 2
          text(' ', start, i)
          continue
        }
        TEXT_CMD.lastIndex = i + 1
        const textCmd = TEXT_CMD.exec(src)
        if (textCmd) {
          i = TEXT_CMD.lastIndex
          text(esc(TEXT_CMD_CHAR[textCmd[1]]), start, i)
          continue
        }

        flush()
        i++
        CMD.lastIndex = i
        const name = CMD.exec(src)?.[0]
        if (!name) {
          if (src[i++] === '\\') {
            out += '<br>'
            skipOpt()
          }
          continue
        }
        i += name.length
        while (src[i] === ' ' || src[i] === '\t') i++ // TeX swallows spaces after a command word

        switch (name) {
          case 'section': case 'section*': case 'subsection': case 'subsection*':
            out += `<h2>${arg()}</h2>`
            break
          case 'textbf':
            out += `<strong>${arg()}</strong>`
            break
          case 'textit': case 'emph':
            out += `<em>${arg()}</em>`
            break
          case 'underline':
            out += `<u>${arg()}</u>`
            break
          case 'href': {
            const url = raw()
            out += link(url, arg())
            break
          }
          case 'url': {
            const url = raw()
            out += link(url, esc(url))
            break
          }
          case 'job': {
            const [title, dates, org, place] = [arg(), arg(), arg(), arg()]
            out += `<div class="rs-row"><strong>${title}</strong><span>${dates}</span></div>` +
              `<div class="rs-row"><em>${org}</em><span>${place}</span></div>`
            break
          }
          case 'begin': {
            const env = raw()
            if (env === 'itemize') out += '<ul>'
            else if (env === 'enumerate') out += '<ol>'
            else if (env === 'tabularx') { readGroup(); readGroup() }
            else if (env === 'tabular' || env === 'minipage') readGroup()
            break
          }
          case 'end': {
            const env = raw()
            if (env === 'itemize') out += '</ul>'
            else if (env === 'enumerate') out += '</ol>'
            break
          }
          case 'item':
            skipOpt()
            out += '<li>'
            break
          case 'textbar':
            out += '|'
            break
          case 'newline':
            out += '<br>'
            break
          default:
            if (SIZE_CLASS[name]) {
              out += `<span class="${SIZE_CLASS[name]}">`
              openSpans++
            } else {
              for (let n = SKIP_ARGS[name] ?? 0; n > 0; n--) readGroup()
            }
        }
        continue
      }

      if (c === '{' || c === '}' || c === '%' || c === '&' || c === '$') {
        flush()
        if (c === '{') out += arg()
        else if (c === '%') {
          const eol = src.indexOf('\n', i)
          i = eol < 0 || eol >= to ? to : eol + 1
        } else {
          if (c === '&') out += ' ' // table column separator
          i++
        }
      } else if (c === '\n') {
        BLANK_LINE.lastIndex = i
        const blank = BLANK_LINE.exec(src)
        if (blank) {
          flush()
          out += '<div class="rs-par"></div>'
          i = Math.min(i + blank[0].length, to)
        } else {
          text(' ', start, ++i)
        }
      } else if (src.startsWith('---', i)) {
        i += 3
        text('—', start, i)
      } else if (src.startsWith('--', i)) {
        i += 2
        text('–', start, i)
      } else if (src.startsWith('``', i) || src.startsWith("''", i)) {
        i += 2
        text(c === '`' ? '“' : '”', start, i)
      } else {
        text(c === '~' ? '&nbsp;' : /\s/.test(c) ? ' ' : esc(c), start, ++i)
      }
    }

    flush()
    return out + '</span>'.repeat(openSpans)
  }

  const begin = src.indexOf('\\begin{document}')
  const end = src.lastIndexOf('\\end{document}')
  return convert(begin < 0 ? 0 : begin + '\\begin{document}'.length, end < 0 ? src.length : end).trim()
}
