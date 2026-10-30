import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Copy,
  Check,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import type {
  ResumeCritique,
  ResumeDocSection,
  CritiqueFinding,
} from "../../services/openrouter";

interface CritiqueSidebarProps {
  critique: ResumeCritique;
  selectedKey: string | null;
  onSectionSelect: (key: string) => void;
  onActiveQuoteChange: (quote: string) => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function scoreBarColor(pct: number) {
  if (pct >= 70) return "bg-green-500";
  if (pct >= 45) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTextColor(pct: number) {
  if (pct >= 70) return "text-green-600 dark:text-green-400";
  if (pct >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// Flatten all findings across sections, worst section first
interface FlatFinding {
  section: ResumeDocSection;
  finding: CritiqueFinding;
}

function flattenFindings(sections: ResumeDocSection[]): FlatFinding[] {
  return sections
    .slice()
    .sort((a, b) => a.score - b.score)
    .flatMap((section) =>
      section.findings.map((finding) => ({ section, finding })),
    );
}

function impactBadge(status: ResumeDocSection["status"]) {
  if (status === "fail")
    return {
      label: "HIGH IMPACT",
      cls: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    };
  if (status === "warn")
    return {
      label: "MEDIUM IMPACT",
      cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    };
  return {
    label: "LOW IMPACT",
    cls: "bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400",
  };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function FeaturedFinding({
  flat,
  index,
  total,
  onPrev,
  onNext,
}: {
  flat: FlatFinding;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const badge = impactBadge(flat.section.status);
  const { finding } = flat;
  const copyText = finding.rewrite || finding.suggestion;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`}
          >
            {badge.label}
          </span>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {flat.section.title}
            <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
              {flat.section.score}/10
            </span>
          </p>
        </div>
        {/* Prev / Next navigation (also ← / → keys) */}
        {total > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onPrev}
              disabled={index === 0}
              aria-label="Previous issue"
              title="Previous issue (←)"
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {index + 1}/{total}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={index === total - 1}
              aria-label="Next issue"
              title="Next issue (→)"
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-card disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Issue description */}
      <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
        {finding.issue}
      </p>

      {/* Quoted problem text */}
      {finding.quote ? (
        <div className="rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
            Current text
          </p>
          <p className="text-xs font-mono text-amber-800 dark:text-amber-200 leading-relaxed break-words">
            "{finding.quote}"
          </p>
        </div>
      ) : flat.section.missing ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-dark-border px-3 py-2">
          <p className="text-xs italic text-gray-500 dark:text-gray-400">
            This section is missing from your resume
          </p>
        </div>
      ) : null}

      {/* How to fix */}
      {finding.suggestion && (
        <div className="rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            How to fix
          </p>
          <p className="text-xs text-gray-800 dark:text-white leading-relaxed">
            {finding.suggestion}
          </p>
        </div>
      )}

      {/* Ready-to-paste rewrite */}
      {finding.rewrite && (
        <div className="rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border px-3 py-2">
          <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
            Suggested rewrite
          </p>
          <p className="text-xs text-green-900 dark:text-green-100 leading-relaxed whitespace-pre-line break-words">
            {finding.rewrite}
          </p>
        </div>
      )}

      {copyText && (
        <button
          type="button"
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied
            ? "Copied!"
            : finding.rewrite
              ? "Copy rewrite"
              : "Copy suggestion"}
        </button>
      )}
    </div>
  );
}

function CleanSection({ section }: { section: ResumeDocSection }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {section.title}
        <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
          {section.score}/10
        </span>
      </p>
      <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        This section looks strong — no issues found.
      </p>
    </div>
  );
}

function MetricsRow({ clarity, impact }: ResumeCritique["metrics"]) {
  if (clarity === null && impact === null) return null;

  const Metric = ({
    label,
    value,
  }: {
    label: string;
    value: number | null;
  }) => {
    if (value === null) return null;
    return (
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <p className={`text-sm font-bold ${scoreTextColor(value)}`}>
            {value}%
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
          <div
            className={`h-full rounded-full ${scoreBarColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-4 py-3 border-t border-b border-gray-100 dark:border-dark-border">
      <Metric label="Clarity" value={clarity} />
      <Metric label="Impact" value={impact} />
    </div>
  );
}

function AllIssues({
  items,
  activeIdx,
  onSelect,
}: {
  items: FlatFinding[];
  activeIdx: number;
  onSelect: (idx: number) => void;
}) {
  if (items.length < 2) return null;
  const dot = (status: ResumeDocSection["status"]) =>
    status === "fail"
      ? "bg-red-500"
      : status === "warn"
        ? "bg-amber-500"
        : "bg-gray-300 dark:bg-gray-600";

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        All issues ({items.length})
      </p>
      <div className="space-y-0.5">
        {items.map((flat, i) => (
          <button
            key={`${flat.section.key}-${i}`}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === activeIdx}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left group ${
              i === activeIdx
                ? "bg-gray-100 dark:bg-dark-border"
                : "hover:bg-gray-50 dark:hover:bg-dark-card"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot(flat.section.status)}`}
            />
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0 max-w-[6rem] truncate">
              {flat.section.title}
            </span>
            <span className="text-xs text-gray-600 dark:text-dark-text-secondary truncate flex-1">
              {flat.finding.issue}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function CritiqueSidebar({
  critique,
  selectedKey,
  onSectionSelect,
  onActiveQuoteChange,
}: CritiqueSidebarProps) {
  const allFindings = useMemo(
    () => flattenFindings(critique.sections),
    [critique.sections],
  );
  const [featuredIdx, setFeaturedIdx] = useState(0);

  // Prev/Next keep their exact position; a click on another section in the document jumps to its first finding.
  const sectionStart = allFindings.findIndex(
    (f) => f.section.key === selectedKey,
  );
  const effectiveIdx =
    !selectedKey ||
    allFindings[featuredIdx]?.section.key === selectedKey ||
    sectionStart < 0
      ? featuredIdx
      : sectionStart;

  const selectedSection = critique.sections.find((s) => s.key === selectedKey);
  const featured = allFindings[effectiveIdx];

  // Lets the document highlight exactly the text this card is about
  const activeQuote =
    selectedSection && selectedSection.findings.length === 0
      ? ""
      : (featured?.finding.quote ?? "");
  useEffect(() => {
    onActiveQuoteChange(activeQuote);
  }, [activeQuote, onActiveQuoteChange]);

  const goTo = (idx: number) => {
    const target = allFindings[idx];
    if (!target) return;
    setFeaturedIdx(idx);
    onSectionSelect(target.section.key);
  };

  // ← / → step through issues unless the user is typing somewhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        el.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      if (e.key === "ArrowRight")
        goTo(Math.min(allFindings.length - 1, effectiveIdx + 1));
      else if (e.key === "ArrowLeft") goTo(Math.max(0, effectiveIdx - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="card p-4 space-y-4">
      {selectedSection && selectedSection.findings.length === 0 ? (
        <CleanSection section={selectedSection} />
      ) : featured ? (
        <FeaturedFinding
          key={effectiveIdx}
          flat={featured}
          index={effectiveIdx}
          total={allFindings.length}
          onPrev={() => goTo(effectiveIdx - 1)}
          onNext={() => goTo(effectiveIdx + 1)}
        />
      ) : (
        <p className="text-sm text-green-700 dark:text-green-400 py-2">
          No issues found — your resume looks strong!
        </p>
      )}

      <MetricsRow {...critique.metrics} />

      <AllIssues items={allFindings} activeIdx={effectiveIdx} onSelect={goTo} />
    </div>
  );
}
