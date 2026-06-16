export function extractLatexFromResponse(response: string): string | null {
  // Strip outer markdown fences (```xml ... ``` or ``` ... ```)
  const stripped = response.replace(/^```[a-z]*\n?([\s\S]*?)\n?```$/i, '$1').trim()

  // Try <latex>...</latex> tag (case-insensitive); also strip inner code fences
  const tagMatch = stripped.match(/<latex>\s*([\s\S]*?)\s*<\/latex>/i)
  if (tagMatch?.[1]?.trim()) {
    const innerRaw = tagMatch[1].trim()
    const innerStripped = innerRaw.replace(/^```[a-z]*\n?([\s\S]*?)\n?```$/i, '$1').trim()
    const candidate = innerStripped || innerRaw
    if (candidate.includes('\\documentclass')) {
      return candidate
    }
  }

  // Fallback: the LLM returned raw LaTeX without the XML wrapper
  const docclassIdx = stripped.indexOf('\\documentclass')
  const endDocIdx = stripped.lastIndexOf('\\end{document}')
  if (docclassIdx !== -1 && endDocIdx !== -1 && endDocIdx > docclassIdx) {
    return stripped.slice(docclassIdx, endDocIdx + '\\end{document}'.length)
  }

  return null
}
