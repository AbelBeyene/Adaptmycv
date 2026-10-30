import { useState } from 'react'
import { ChevronRight, Copy, Check, ChevronLeft } from 'lucide-react'
import type { ResumeCritique, ResumeDocSection, CritiqueFinding } from '../../services/openrouter'

interface CritiqueSidebarProps {
  critique: ResumeCritique
  selectedKey: string | null
  onSectionSelect: (key: string) => void
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function letterGrade(score: number): string {
  if (score >= 93) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 87) return 'A-'
  if (score >= 83) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 77) return 'B-'
  if (score >= 73) return 'C+'
  if (score >= 70) return 'C'
  if (score >= 67) return 'C-'
  if (score >= 60) return 'D'
  return 'F'
}

function gradeColors(score: number) {
  if (score >= 80) return { ring: 'ring-green-400', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }
  if (score >= 60) return { ring: 'ring-amber-400', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  return { ring: 'ring-red-400', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
}

function scoreBarColor(pct: number) {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 45) return 'bg-amber-500'
  return 'bg-red-500'
}

// Flatten all findings across sections into a sorted list (fail → warn → pass)
interface FlatFinding {
  section: ResumeDocSection
  finding: CritiqueFinding
  findingIdx: number
}

function flattenFindings(sections: ResumeDocSection[]): FlatFinding[] {
  const order = { fail: 0, warn: 1, pass: 2 }
  return sections
    .slice()
    .sort((a, b) => order[a.status] - order[b.status])
    .flatMap((section) =>
      section.findings.map((finding, findingIdx) => ({ section, finding, findingIdx }))
    )
}

// Compute derived metrics from section scores
function computeMetrics(sections: ResumeDocSection[]) {
  const avg = (keys: string[]) => {
    const matched = sections.filter((s) =>
      keys.some((k) => s.key.toLowerCase().includes(k) || s.title.toLowerCase().includes(k))
    )
    if (!matched.length) return null
    return Math.round((matched.reduce((sum, s) => sum + s.score, 0) / matched.length) * 10)
  }

  return {
    clarity: avg(['format', 'tone', 'language', 'summar']),
    impact: avg(['experience', 'keyword', 'skill', 'achiev', 'work']),
  }
}

function impactBadge(status: ResumeDocSection['status']) {
  if (status === 'fail') return { label: 'HIGH IMPACT', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' }
  if (status === 'warn') return { label: 'MEDIUM IMPACT', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' }
  return { label: 'LOW IMPACT', cls: 'bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400' }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ScoreHeader({ score }: { score: number }) {
  const grade = letterGrade(score)
  const colors = gradeColors(score)

  return (
    <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-dark-border">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
          Overall Resume Score
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
          {score}
          <span className="text-base font-normal text-gray-400 dark:text-gray-500">/100</span>
        </p>
      </div>
      <div className={`w-14 h-14 rounded-full ring-4 ${colors.ring} ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-lg font-bold ${colors.text}`}>{grade}</span>
      </div>
    </div>
  )
}

function FeaturedFinding({
  flat,
  index,
  total,
  onPrev,
  onNext,
  onSectionSelect,
}: {
  flat: FlatFinding
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onSectionSelect: (key: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const badge = impactBadge(flat.section.status)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(flat.finding.suggestion)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>
            {badge.label}
          </span>
          <button
            type="button"
            onClick={() => onSectionSelect(flat.section.key)}
            className="block text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left"
          >
            {flat.section.title}
          </button>
        </div>
        {/* Prev / Next navigation */}
        {total > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={index === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-gray-400 tabular-nums">{index + 1}/{total}</span>
            <button
              onClick={onNext}
              disabled={index === total - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Issue description */}
      <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{flat.finding.issue}</p>

      {/* Quoted problem text */}
      {flat.finding.quote && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Current text</p>
          <p className="text-xs font-mono text-amber-800 dark:text-amber-200 leading-relaxed">"{flat.finding.quote}"</p>
        </div>
      )}

      {/* Suggested fix */}
      <div className="rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2">
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Suggested Fix</p>
        <p className="text-xs text-gray-800 dark:text-white leading-relaxed">{flat.finding.suggestion}</p>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : 'Copy suggestion'}
      </button>
    </div>
  )
}

function MetricsRow({ clarity, impact }: { clarity: number | null; impact: number | null }) {
  if (!clarity && !impact) return null

  const Metric = ({ label, value }: { label: string; value: number | null }) => {
    if (value === null) return null
    return (
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
          <p className={`text-sm font-bold ${value >= 70 ? 'text-green-600 dark:text-green-400' : value >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {value}%
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
          <div className={`h-full rounded-full ${scoreBarColor(value)}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 py-3 border-t border-b border-gray-100 dark:border-dark-border">
      <Metric label="Clarity" value={clarity} />
      <Metric label="Impact" value={impact} />
    </div>
  )
}

function OtherImprovements({
  items,
  onSelect,
}: {
  items: FlatFinding[]
  onSelect: (sectionKey: string) => void
}) {
  if (!items.length) return null
  const badge = (status: ResumeDocSection['status']) => {
    if (status === 'fail') return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    if (status === 'warn') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    return 'bg-gray-100 dark:bg-dark-card text-gray-500'
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Other Improvements ({items.length})
      </p>
      <div className="space-y-1">
        {items.map((flat, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(flat.section.key)}
            className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${badge(flat.section.status)}`}>
                {flat.section.title.split(' ')[0].toUpperCase()}
              </span>
              <p className="text-xs text-gray-600 dark:text-dark-text-secondary truncate">{flat.finding.issue}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function CritiqueSidebar({ critique, selectedKey, onSectionSelect }: CritiqueSidebarProps) {
  const allFindings = flattenFindings(critique.sections)
  const [featuredIdx, setFeaturedIdx] = useState(0)

  // When a section is selected from the doc, jump to that section's first finding
  const effectiveIdx = (() => {
    if (!selectedKey) return featuredIdx
    const idx = allFindings.findIndex((f) => f.section.key === selectedKey)
    return idx >= 0 ? idx : featuredIdx
  })()

  const featured = allFindings[effectiveIdx]
  const others = allFindings.filter((_, i) => i !== effectiveIdx)
  const metrics = computeMetrics(critique.sections)

  const handlePrev = () => {
    const newIdx = Math.max(0, effectiveIdx - 1)
    setFeaturedIdx(newIdx)
    onSectionSelect(allFindings[newIdx].section.key)
  }

  const handleNext = () => {
    const newIdx = Math.min(allFindings.length - 1, effectiveIdx + 1)
    setFeaturedIdx(newIdx)
    onSectionSelect(allFindings[newIdx].section.key)
  }

  const handleOtherSelect = (key: string) => {
    const idx = allFindings.findIndex((f) => f.section.key === key)
    if (idx >= 0) setFeaturedIdx(idx)
    onSectionSelect(key)
  }

  return (
    <div className="card p-4 space-y-4">
      <ScoreHeader score={critique.overallScore} />

      {featured ? (
        <FeaturedFinding
          flat={featured}
          index={effectiveIdx}
          total={allFindings.length}
          onPrev={handlePrev}
          onNext={handleNext}
          onSectionSelect={onSectionSelect}
        />
      ) : (
        <p className="text-sm text-green-700 dark:text-green-400 py-2">
          No issues found — your resume looks strong!
        </p>
      )}

      <MetricsRow clarity={metrics.clarity} impact={metrics.impact} />

      <OtherImprovements items={others.slice(0, 6)} onSelect={handleOtherSelect} />
    </div>
  )
}
