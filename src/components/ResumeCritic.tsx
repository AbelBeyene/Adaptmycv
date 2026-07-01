import { useState, useEffect } from 'react'
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Zap, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeResumeCritique, ResumeCritique, CritiqueSection } from '../services/openrouter'

interface ResumeCriticProps {
  resumeText: string
  onBack: () => void
}

const CRITIC_CACHE_KEY = 'adaptmycv-resume-critic-v1'

function StatusIcon({ status }: { status: CritiqueSection['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
  return <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
}

function statusBg(status: CritiqueSection['status']) {
  if (status === 'pass') return 'border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10'
  if (status === 'warn') return 'border-yellow-200 dark:border-yellow-800/40 bg-yellow-50/50 dark:bg-yellow-900/10'
  return 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10'
}

function scoreBadge(score: number) {
  if (score >= 7) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
  if (score >= 4) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
}

function overallScoreColor(score: number) {
  if (score >= 70) return 'text-green-600 dark:text-green-400'
  if (score >= 45) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function SectionCard({ section }: { section: CritiqueSection }) {
  const [expanded, setExpanded] = useState(section.status !== 'pass')

  return (
    <div className={`rounded-lg border p-3 transition-colors ${statusBg(section.status)}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={section.status} />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{section.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBadge(section.score)}`}>
            {section.score}/10
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-500 dark:text-dark-text-secondary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-dark-text-secondary" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2.5 pl-6">
          {section.findings.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary mb-1">
                Findings
              </p>
              <ul className="space-y-1">
                {section.findings.map((f, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-dark-text-secondary flex gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section.suggestions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-text-secondary mb-1">
                How to improve
              </p>
              <ul className="space-y-1">
                {section.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-dark-text-secondary flex gap-2">
                    <span className="mt-1 text-xs">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResumeCritic({ resumeText, onBack }: ResumeCriticProps) {
  const [critique, setCritique] = useState<ResumeCritique | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const cached = window.localStorage.getItem(CRITIC_CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as { resumeText: string; critique: ResumeCritique }
          if (parsed.resumeText === resumeText && parsed.critique) {
            setCritique(parsed.critique)
            setIsLoading(false)
            return
          }
        }
      } catch { /* ignore stale cache */ }

      try {
        setIsLoading(true)
        setError(null)
        const result = await analyzeResumeCritique(resumeText)
        setCritique(result)
        try {
          window.localStorage.setItem(CRITIC_CACHE_KEY, JSON.stringify({ resumeText, critique: result }))
        } catch { /* non-critical */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze resume')
      } finally {
        setIsLoading(false)
      }
    }

    run()
  }, [resumeText])

  const handleRerun = async () => {
    try {
      window.localStorage.removeItem(CRITIC_CACHE_KEY)
    } catch { /* ignore */ }
    setIsLoading(true)
    setError(null)
    setCritique(null)

    try {
      const result = await analyzeResumeCritique(resumeText)
      setCritique(result)
      try {
        window.localStorage.setItem(CRITIC_CACHE_KEY, JSON.stringify({ resumeText, critique: result }))
      } catch { /* non-critical */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume')
    } finally {
      setIsLoading(false)
    }
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
        <div className="flex-1 min-w-0">
          <h2 className="section-title">Resume Critic</h2>
          <p className="section-subtitle mt-1">11-point professional resume audit</p>
        </div>
        {critique && !isLoading && (
          <button
            type="button"
            onClick={handleRerun}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Re-run
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="card p-5 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full shimmer" />
            <div className="h-4 w-32 rounded shimmer" />
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Analyzing your resume across 11 criteria…</p>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-dark-border p-3 space-y-2">
                <div className="h-4 w-48 rounded shimmer" />
                <div className="h-3 w-full rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Analysis failed</p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{error}</p>
              <button type="button" onClick={handleRerun} className="btn-primary text-sm px-4 py-2">
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && critique && (
        <div className="space-y-5">
          {/* Overall score */}
          <div className="card p-5 flex items-center gap-5">
            <div className="flex flex-col items-center">
              <span className={`text-5xl font-bold tabular-nums ${overallScoreColor(critique.overallScore)}`}>
                {critique.overallScore}
              </span>
              <span className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">out of 100</span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    critique.overallScore >= 70
                      ? 'bg-green-500'
                      : critique.overallScore >= 45
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${critique.overallScore}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                {critique.overallScore >= 70
                  ? 'Strong resume — minor improvements remain'
                  : critique.overallScore >= 45
                  ? 'Decent foundation — meaningful improvements possible'
                  : 'Needs significant work before applying'}
              </p>
            </div>
          </div>

          {/* Top red flags */}
          {critique.topRedFlags.length > 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Top Red Flags</h3>
              </div>
              <ul className="space-y-1.5">
                {critique.topRedFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-red-700 dark:text-red-300 flex gap-2">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick wins */}
          {critique.quickWins.length > 0 && (
            <div className="rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Quick Wins</h3>
              </div>
              <ul className="space-y-1.5">
                {critique.quickWins.map((win, i) => (
                  <li key={i} className="text-sm text-green-700 dark:text-green-300 flex gap-2">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Section Breakdown</h3>
            <div className="space-y-2">
              {critique.sections.map((section) => (
                <SectionCard key={section.key} section={section} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
