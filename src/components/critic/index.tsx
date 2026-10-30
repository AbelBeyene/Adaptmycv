import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { analyzeResumeCritique, ResumeCritique } from '../../services/openrouter'
import ScoreBar from './ScoreBar'
import CritiqueSidebar from './CritiqueSidebar'
import ResumeDocument from './ResumeDocument'

interface ResumeCriticProps {
  resumeText: string
  onBack: () => void
}

const CACHE_KEY = 'adaptmycv-resume-critic-v1'

export default function ResumeCritic({ resumeText, onBack }: ResumeCriticProps) {
  const [critique, setCritique] = useState<ResumeCritique | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const runCritique = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      try {
        const cached = window.localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as { resumeText: string; critique: ResumeCritique }
          if (parsed.resumeText === resumeText && parsed.critique?.resumeMarkdown) {
            setCritique(parsed.critique)
            setSelectedKey(parsed.critique.sections[0]?.key ?? null)
            setIsLoading(false)
            return
          }
        }
      } catch { /* ignore */ }
    }

    setIsLoading(true)
    setError(null)
    setCritique(null)
    setSelectedKey(null)

    try {
      const result = await analyzeResumeCritique(resumeText)
      setCritique(result)
      setSelectedKey(result.sections[0]?.key ?? null)
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ resumeText, critique: result }))
      } catch { /* storage full */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume')
    } finally {
      setIsLoading(false)
    }
  }, [resumeText])

  useEffect(() => { runCritique(false) }, [runCritique])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="section-title">Resume Critic</h2>
          <p className="section-subtitle mt-0.5">Click any section to see specific, actionable feedback</p>
        </div>
        {critique && !isLoading && (
          <button
            type="button"
            onClick={() => runCritique(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
            title="Re-run analysis"
          >
            <RefreshCw className="w-4 h-4 text-gray-500 dark:text-dark-text-secondary" />
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded shimmer" />
              <div className="h-2 rounded shimmer" />
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                Parsing and critiquing your resume…
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 rounded shimmer" />
                <div className="h-3 w-full rounded shimmer" />
                <div className="h-3 w-3/4 rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Analysis failed</p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{error}</p>
              <button onClick={() => runCritique(true)} className="btn-primary text-sm px-4 py-2">
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && critique && (
        <div className="space-y-5">
          {/* Mobile-only: score bar + red flags */}
          <div className="lg:hidden">
            <ScoreBar
              score={critique.overallScore}
              redFlags={critique.topRedFlags}
              quickWins={critique.quickWins}
            />
          </div>

          {/* Desktop: resume doc (left) + critique sidebar (right) */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_360px] gap-5 items-start">
            <ResumeDocument
              markdown={critique.resumeMarkdown}
              sections={critique.sections}
              selectedKey={selectedKey}
              onSectionClick={setSelectedKey}
            />
            <div className="sticky top-24">
              <CritiqueSidebar
                critique={critique}
                selectedKey={selectedKey}
                onSectionSelect={setSelectedKey}
              />
            </div>
          </div>

          {/* Mobile: resume doc full width, sidebar below */}
          <div className="lg:hidden space-y-4">
            <ResumeDocument
              markdown={critique.resumeMarkdown}
              sections={critique.sections}
              selectedKey={selectedKey}
              onSectionClick={setSelectedKey}
            />
            <CritiqueSidebar
              critique={critique}
              selectedKey={selectedKey}
              onSectionSelect={setSelectedKey}
            />
          </div>
        </div>
      )}
    </div>
  )
}
