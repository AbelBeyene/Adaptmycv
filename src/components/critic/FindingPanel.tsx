import { CheckCircle2, XCircle, Zap, AlertCircle } from 'lucide-react'
import type { ResumeDocSection, CritiqueFinding } from '../../services/openrouter'

interface FindingPanelProps {
  section: ResumeDocSection | null
}

function scorePill(score: number) {
  if (score >= 7) return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
  if (score >= 4) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
  return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
}

function FindingCard({ finding, index }: { finding: CritiqueFinding; index: number }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card p-3 space-y-2">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        Issue {index + 1}
      </p>

      {finding.quote ? (
        <div className="rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 px-2.5 py-2">
          <p className="text-xs font-mono text-yellow-900 dark:text-yellow-200 leading-relaxed break-words">
            "{finding.quote}"
          </p>
        </div>
      ) : (
        <div className="rounded bg-gray-50 dark:bg-dark-card/50 border border-dashed border-gray-300 dark:border-dark-border px-2.5 py-2">
          <p className="text-xs italic text-gray-400 dark:text-gray-500">Section is missing from the resume</p>
        </div>
      )}

      <div className="flex gap-2 items-start">
        <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{finding.issue}</p>
      </div>

      <div className="flex gap-2 items-start">
        <Zap className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-gray-900 dark:text-white">{finding.suggestion}</p>
      </div>
    </div>
  )
}

export default function FindingPanel({ section }: FindingPanelProps) {
  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-52 gap-3 text-gray-400 dark:text-gray-500">
        <AlertCircle className="w-8 h-8 opacity-30" />
        <p className="text-sm text-center">Click a section in the resume to see specific feedback</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex-1">{section.title}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${scorePill(section.score)}`}>
          {section.score}/10
        </span>
      </div>

      {section.findings.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          This section looks strong — no issues found.
        </div>
      ) : (
        section.findings.map((finding, i) => (
          <FindingCard key={i} finding={finding} index={i} />
        ))
      )}
    </div>
  )
}
