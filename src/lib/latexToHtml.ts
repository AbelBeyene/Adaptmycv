// Renders the subset of LaTeX used by template_ATS_resume.tex as HTML, so the preview needs no
// network compile. Unknown commands are dropped but their {arguments} still render as text.
// shortcut: no math, tables or custom macros beyond \job; upgrade to a WASM TeX engine if exact typesetting matters.

const SIZE_CLASS: Record<string, string> = { LARGE: 'rs-name', Large: 'rs-lg', large: 'rs-lg', huge: 'rs-name', Huge: 'rs-name' }

// Commands whose arguments are layout-only and must not show up as text
const SKIP_ARGS: Record<string, number> = {
  vspace: 1, 'vspace*': 1, hspace: 1, 'hspace*': 1, selectlanguage: 1, setlength: 2, addtolength: 2,
  pagestyle: 1, thispagestyle: 1, includegraphics: 1, fontsize: 2, setmainfont: 1, color: 1,
}

const CMD = /[a-zA-Z]+\*?/y

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function link(rawUrl: string, html: string): string {
  const url = rawUrl.trim().replace(/\\([&%#_$~])/g, '$1')
  return /^(https?:|mailto:)/i.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${html}</a>` : html
}

function convert(src: string): string {
  let i = 0
  let out = ''
  let openSpans = 0

  // Reads the next {group} (skipping whitespace and [options]); returns '' and leaves i alone if there is none
  const readGroup = (): string => {
    const saved = i
    while (/\s/.test(src[i] ?? '') || src[i] === '[') {
      if (src[i] === '[') {
        const close = src.indexOf(']', i)
        i = close < 0 ? src.length : close + 1
      } else i++
    }
    if (src[i] !== '{') {
      i = saved
      return ''
    }
    const start = i + 1
    let depth = 0
    for (; i < src.length; i++) {
      if (src[i] === '\\') i++
      else if (src[i] === '{') depth++
      else if (src[i] === '}' && --depth === 0) return src.slice(start, i++)
    }
    return src.slice(start)
  }
  const arg = () => convert(readGroup())

  while (i < src.length) {
    const c = src[i]

    if (c === '\\') {
      i++
      CMD.lastIndex = i
      const name = CMD.exec(src)?.[0]
      if (!name) {
        const symbol = src[i++] ?? ''
        if (symbol === '\\') {
          out += '<br>'
          if (src[i] === '[') i = src.indexOf(']', i) + 1 || src.length
        } else if ('&%#$_{}'.includes(symbol)) out += esc(symbol)
        else if (/\s|[,;:!]/.test(symbol)) out += ' '
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
          const url = readGroup()
          out += link(url, arg())
          break
        }
        case 'url': {
          const url = readGroup()
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
          const env = readGroup()
          if (env === 'itemize') out += '<ul>'
          else if (env === 'enumerate') out += '<ol>'
          else if (env === 'tabularx') { readGroup(); readGroup() }
          else if (env === 'tabular' || env === 'minipage') readGroup()
          break
        }
        case 'end': {
          const env = readGroup()
          if (env === 'itemize') out += '</ul>'
          else if (env === 'enumerate') out += '</ol>'
          break
        }
        case 'item':
          if (src[i] === '[') i = src.indexOf(']', i) + 1 || src.length
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

    if (c === '{') {
      out += arg()
    } else if (c === '}') {
      i++
    } else if (c === '%') {
      const eol = src.indexOf('\n', i)
      i = eol < 0 ? src.length : eol + 1
    } else if (c === '\n') {
      const blank = /\n[ \t]*\n\s*/y
      blank.lastIndex = i
      const m = blank.exec(src)
      out += m ? '<div class="rs-par"></div>' : ' '
      i += m ? m[0].length : 1
    } else if (src.startsWith('---', i)) {
      out += '—'
      i += 3
    } else if (src.startsWith('--', i)) {
      out += '–'
      i += 2
    } else if (src.startsWith('``', i) || src.startsWith("''", i)) {
      out += c === '`' ? '“' : '”'
      i += 2
    } else {
      out += c === '~' ? '&nbsp;' : c === '&' ? ' ' : c === '$' ? '' : esc(c)
      i++
    }
  }

  return out + '</span>'.repeat(openSpans)
}

export function latexToHtml(latex: string): string {
  const begin = latex.indexOf('\\begin{document}')
  const end = latex.lastIndexOf('\\end{document}')
  return convert(latex.slice(begin < 0 ? 0 : begin + '\\begin{document}'.length, end < 0 ? undefined : end)).trim()
}
