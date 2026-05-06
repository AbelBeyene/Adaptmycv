import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Lightbulb,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  buildLatexPdfUrl,
  generateTailoredResumeLatex,
  TailoredResumeLatex,
} from '../services/openrouter'

interface TailoredResumePrepProps {
  resumeText: string
  jobDescription: string
  onBack: () => void
}

type EditorPanel = 'sections' | 'latex' | 'ideas'

type ResumeSections = {
  professionalSummary: string
  education: string
  technicalSkills: string
  workExperience: string
  projects: string
  languages: string
}

const STUDIO_CACHE_KEY = 'adaptmycv-resume-studio-v1'

const sectionOrder: Array<{ key: keyof ResumeSections; title: string }> = [
  { key: 'professionalSummary', title: 'Professional Summary' },
  { key: 'education', title: 'Education' },
  { key: 'technicalSkills', title: 'Technical Skills' },
  { key: 'workExperience', title: 'Work Experience' },
  { key: 'projects', title: 'Projects' },
  { key: 'languages', title: 'Languages' },
]

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSectionContent(latex: string, title: string, nextTitles: string[]): string {
  const boundary =
    nextTitles.length > 0
      ? `(?=\\\\section\\*\\{(?:${nextTitles.map(escapeRegex).join('|')})\\}|\\\\end\\{document\\})`
      : `(?=\\\\end\\{document\\})`
  const pattern = new RegExp(`\\\\section\\*\\{${escapeRegex(title)}\\}([\\s\\S]*?)${boundary}`)

  const match = latex.match(pattern)
  return match?.[1]?.trim() || ''
}

function parseResumeSections(latex: string): ResumeSections {
  const sections = {} as ResumeSections

  sectionOrder.forEach((section, index) => {
    const nextTitles = sectionOrder.slice(index + 1).map((item) => item.title)
    sections[section.key] = extractSectionContent(latex, section.title, nextTitles)
  })

  return sections
}

function replaceSectionContent(latex: string, title: string, newContent: string, nextTitles: string[]): string {
  const boundary =
    nextTitles.length > 0
      ? `(?=\\\\section\\*\\{(?:${nextTitles.map(escapeRegex).join('|')})\\}|\\\\end\\{document\\})`
      : `(?=\\\\end\\{document\\})`
  const pattern = new RegExp(`(\\\\section\\*\\{${escapeRegex(title)}\\})([\\s\\S]*?)${boundary}`)

  const normalizedContent = newContent.trim()
  return latex.replace(pattern, (_, header: string) => {
    return `${header}\n${normalizedContent ? `${normalizedContent}\n\n` : '\n'}`
  })
}

function rebuildLatexFromSections(latex: string, sections: ResumeSections): string {
  return sectionOrder.reduce((currentLatex, section, index) => {
    const nextTitles = sectionOrder.slice(index + 1).map((item) => item.title)
    return replaceSectionContent(currentLatex, section.title, sections[section.key], nextTitles)
  }, latex)
}

export default function TailoredResumePrep({
  resumeText,
  jobDescription,
  onBack,
}: TailoredResumePrepProps) {
  const [tailoredResume, setTailoredResume] = useState<TailoredResumeLatex | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activePanel, setActivePanel] = useState<EditorPanel>('sections')
  const [editableLatex, setEditableLatex] = useState('')
  const [compiledLatex, setCompiledLatex] = useState('')
  const [sections, setSections] = useState<ResumeSections>({
    professionalSummary: '',
    education: '',
    technicalSkills: '',
    workExperience: '',
    projects: '',
    languages: '',
  })

  const generateResume = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setTailoredResume(null)
      setEditableLatex('')
      setCompiledLatex('')

      const generatedResume = await generateTailoredResumeLatex(resumeText, jobDescription)
      setTailoredResume(generatedResume)
      setEditableLatex(generatedResume.latex)
      setCompiledLatex(generatedResume.latex)
      setSections(parseResumeSections(generatedResume.latex))
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Failed to generate tailored LaTeX resume'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadTailoredResume = async () => {
      try {
        const cachedStudio = window.localStorage.getItem(STUDIO_CACHE_KEY)
        if (cachedStudio) {
          const parsed = JSON.parse(cachedStudio) as Partial<{
            resumeText: string
            jobDescription: string
            tailoredResume: TailoredResumeLatex
            editableLatex: string
            compiledLatex: string
            activePanel: EditorPanel
            sections: ResumeSections
          }>

          if (
            parsed.resumeText === resumeText &&
            parsed.jobDescription === jobDescription &&
            parsed.tailoredResume &&
            typeof parsed.editableLatex === 'string'
          ) {
            setTailoredResume(parsed.tailoredResume)
            setEditableLatex(parsed.editableLatex)
            setCompiledLatex(parsed.compiledLatex || parsed.editableLatex)
            setSections(parsed.sections || parseResumeSections(parsed.editableLatex))
            setActivePanel(parsed.activePanel || 'sections')
            setIsLoading(false)
            return
          }
        }
      } catch (cacheError) {
        console.warn('Failed to restore resume studio cache:', cacheError)
      }

      try {
        setIsLoading(true)
        setError(null)
        setTailoredResume(null)
        setEditableLatex('')
        setCompiledLatex('')

        const generatedResume = await generateTailoredResumeLatex(resumeText, jobDescription)
        if (cancelled) {
          return
        }

        setTailoredResume(generatedResume)
        setEditableLatex(generatedResume.latex)
        setCompiledLatex(generatedResume.latex)
        setSections(parseResumeSections(generatedResume.latex))
      } catch (generationError) {
        if (cancelled) {
          return
        }

        setError(
          generationError instanceof Error
            ? generationError.message
            : 'Failed to generate tailored LaTeX resume'
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadTailoredResume()

    return () => {
      cancelled = true
    }
  }, [resumeText, jobDescription])

  useEffect(() => {
    if (!editableLatex.trim()) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCompiledLatex(editableLatex)
    }, 700)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [editableLatex])

  useEffect(() => {
    if (!tailoredResume || !editableLatex.trim()) {
      return
    }

    try {
      window.localStorage.setItem(
        STUDIO_CACHE_KEY,
        JSON.stringify({
          resumeText,
          jobDescription,
          tailoredResume,
          editableLatex,
          compiledLatex,
          activePanel,
          sections,
        })
      )
    } catch (cacheError) {
      console.warn('Failed to persist resume studio cache:', cacheError)
    }
  }, [resumeText, jobDescription, tailoredResume, editableLatex, compiledLatex, activePanel, sections])

  const latexPdfUrl = useMemo(() => {
    if (!compiledLatex.trim()) {
      return null
    }

    return buildLatexPdfUrl(compiledLatex, 'adapted-harvard-resume.pdf')
  }, [compiledLatex])

  const handleCopy = async () => {
    if (!editableLatex.trim()) {
      return
    }

    try {
      await navigator.clipboard.writeText(editableLatex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (copyError) {
      console.error('Failed to copy LaTeX resume:', copyError)
    }
  }

  const handleDownload = () => {
    if (!editableLatex.trim()) {
      return
    }

    const blob = new Blob([editableLatex], { type: 'text/x-tex;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'adapted-harvard-resume.tex'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  }

  const handleSectionChange = (key: keyof ResumeSections, value: string) => {
    const updatedSections = { ...sections, [key]: value }
    setSections(updatedSections)
    setEditableLatex((currentLatex) => rebuildLatexFromSections(currentLatex, updatedSections))
  }

  const handleLatexChange = (value: string) => {
    setEditableLatex(value)
    setSections(parseResumeSections(value))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="section-title mb-2">Prepare Enhanced Resume</h2>
          <p className="section-subtitle">
            Building a template-based LaTeX resume tailored to this role without inventing experience.
          </p>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
            <Sparkles className="w-4 h-4" />
            Generating ATS-focused LaTeX resume...
          </div>
          <div className="h-5 w-1/3 rounded shimmer" />
          <div className="h-32 w-full rounded-lg shimmer" />
          <div className="h-64 w-full rounded-lg shimmer" />
        </div>
      </div>
    )
  }

  if (error || !tailoredResume) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="section-title">Prepare Enhanced Resume</h2>
            <p className="section-subtitle mt-1">We couldn’t generate the tailored LaTeX resume yet.</p>
          </div>
        </div>

        <div className="card border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Generation failed</h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                {error || 'No tailored resume was generated.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="btn-secondary flex-1">
            Back
          </button>
          <button onClick={generateResume} className="btn-primary flex-1">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="section-title">Prepare Enhanced Resume</h2>
          <p className="section-subtitle mt-1">
            A separate studio for editing LaTeX, previewing the compile, and shaping the final resume.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Studio controls</p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Work directly in the generated LaTeX or switch to product ideas for what this page can evolve into next.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActivePanel('sections')}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  activePanel === 'sections'
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'bg-gray-100 dark:bg-dark-card border-gray-300 dark:border-dark-border'
                }`}
              >
                Sections
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('latex')}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  activePanel === 'latex'
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'bg-gray-100 dark:bg-dark-card border-gray-300 dark:border-dark-border'
                }`}
              >
                LaTeX
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('ideas')}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  activePanel === 'ideas'
                    ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                    : 'bg-gray-100 dark:bg-dark-card border-gray-300 dark:border-dark-border'
                }`}
              >
                Ideas
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-dark-border p-4 bg-gray-50 dark:bg-dark-card/50">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Tailoring summary</p>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              {tailoredResume.summary}
            </p>
          </div>

          {!!tailoredResume.warnings.length && (
            <div className="rounded-lg border border-orange-200 dark:border-orange-900/40 p-4 bg-orange-50 dark:bg-orange-900/10">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-2">
                Factual guardrails
              </p>
              <div className="space-y-1">
                {tailoredResume.warnings.map((warning) => (
                  <p key={warning} className="text-sm text-orange-800 dark:text-orange-300">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'sections' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Section editor</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={handleCopy} className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy .tex'}
                  </button>
                  <button type="button" onClick={handleDownload} className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs">
                    <Download className="w-4 h-4" />
                    Download .tex
                  </button>
                  <button type="button" onClick={generateResume} className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs">
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {sectionOrder.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-lg border border-gray-200 dark:border-dark-border p-3 bg-white dark:bg-dark-card"
                  >
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {section.title}
                    </label>
                    <textarea
                      value={sections[section.key]}
                      onChange={(event) => handleSectionChange(section.key, event.target.value)}
                      spellCheck={false}
                      className="input-field min-h-28 resize-y font-mono text-xs leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                These sections map back into the current LaTeX document and update the PDF preview automatically.
              </p>
            </div>
          ) : activePanel === 'latex' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">LaTeX editor</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={handleCopy} className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy .tex'}
                  </button>
                  <button type="button" onClick={handleDownload} className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs">
                    <Download className="w-4 h-4" />
                    Download .tex
                  </button>
                  <button type="button" onClick={generateResume} className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs">
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              </div>

              <textarea
                value={editableLatex}
                onChange={(event) => handleLatexChange(event.target.value)}
                spellCheck={false}
                className="input-field min-h-[34rem] resize-y font-mono text-xs leading-relaxed"
              />

              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                The PDF preview recompiles automatically a moment after you stop typing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                'Structured section editing for Summary, Skills, Experience, Projects, and Education instead of raw LaTeX only.',
                'Inline ATS keyword coverage showing matched, missing, and overused job-description terms.',
                'Bullet-level rewrite tools like “tighten”, “shorten”, and “make more ATS-friendly” with truth checks.',
                'Version snapshots for Original, ATS-heavy, one-page, and recruiter-friendly variants.',
                'Compile diagnostics for LaTeX errors, layout overflow, and broken links.',
                'Field locking so company names, dates, and titles can never be changed by AI.',
              ].map((idea) => (
                <div
                  key={idea}
                  className="rounded-lg border border-gray-200 dark:border-dark-border p-3 bg-white dark:bg-dark-card"
                >
                  <div className="flex gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{idea}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Live PDF preview</p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                This preview is compiled from the current LaTeX using the ATS template-based output.
              </p>
            </div>
            {latexPdfUrl && (
              <a href={latexPdfUrl} target="_blank" rel="noreferrer" className="btn-primary px-2 py-1 text-xs">
                Open PDF
              </a>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-dark-border p-3 bg-gray-50 dark:bg-dark-card/50">
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
              Auto-compile status: {compiledLatex === editableLatex ? 'Up to date' : 'Compiling changes...'}
            </p>
          </div>

          {latexPdfUrl ? (
            <iframe
              src={latexPdfUrl}
              title="Tailored LaTeX resume PDF preview"
              className="w-full h-[46rem] rounded border border-gray-200 dark:border-dark-border bg-white"
            />
          ) : (
            <div className="rounded-lg border border-gray-200 dark:border-dark-border p-6 bg-gray-50 dark:bg-dark-card/50">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                The preview will appear here once LaTeX content is available.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-primary flex-1">
          Back To Analysis
        </button>
      </div>
    </div>
  )
}
