import { XCircle, Zap } from 'lucide-react'

interface ScoreBarProps {
  score: number
  redFlags: string[]
  quickWins: string[]
}

function barColor(score: number) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 45) return 'bg-yellow-500'
  return 'bg-red-500'
}

function scoreTextColor(score: number) {
  if (score >= 70) return 'text-green-600 dark:text-green-400'
  if (score >= 45) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function scoreLabel(score: number) {
  if (score >= 70) return 'Strong resume — minor polish remaining'
  if (score >= 45) return 'Decent base — meaningful improvements available'
  return 'Needs significant work before applying'
}

export default function ScoreBar({ score, redFlags, quickWins }: ScoreBarProps) {
  return (
    <div className="space-y-3">
      {/* Score row */}
      <div className="card p-4 flex items-center gap-5">
        <div className="flex flex-col items-center flex-shrink-0">
          <span className={`text-4xl font-bold tabular-nums ${scoreTextColor(score)}`}>{score}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">/ 100</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{scoreLabel(score)}</p>
        </div>
      </div>

      {/* Flags + wins */}
      {(redFlags.length > 0 || quickWins.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {redFlags.length > 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50/60 dark:bg-red-900/10 p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Top Red Flags</h3>
              </div>
              <ul className="space-y-1">
                {redFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-red-700 dark:text-red-300 flex gap-2">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {quickWins.length > 0 && (
            <div className="rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50/60 dark:bg-green-900/10 p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Quick Wins</h3>
              </div>
              <ul className="space-y-1">
                {quickWins.map((win, i) => (
                  <li key={i} className="text-xs text-green-700 dark:text-green-300 flex gap-2">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    {win}
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
