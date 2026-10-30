import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import {
  analyzeResumeCritique,
  ResumeCritique,
} from "../../services/openrouter";
import ScoreBar from "./ScoreBar";
import CritiqueSidebar from "./CritiqueSidebar";
import ResumeDocument from "./ResumeDocument";

interface ResumeCriticProps {
  resumeText: string;
  jobDescription?: string;
  onBack: () => void;
  onPrepareResume: (critique: ResumeCritique) => void;
}

const CACHE_KEY = "adaptmycv-resume-critic-v2";

// Open on the weakest section that has something to fix
function initialKey(critique: ResumeCritique): string | null {
  const worst = critique.sections
    .slice()
    .sort((a, b) => a.score - b.score)
    .find((s) => s.findings.length);
  return worst?.key ?? critique.sections[0]?.key ?? null;
}

export default function ResumeCritic({
  resumeText,
  jobDescription = "",
  onBack,
  onPrepareResume,
}: ResumeCriticProps) {
  const [critique, setCritique] = useState<ResumeCritique | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Stacked layout: the feedback sits below the resume, so bring it into view
  const handleDocSectionClick = (key: string) => {
    setSelectedKey(key);
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      sidebarRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const runCritique = useCallback(
    async (skipCache = false) => {
      if (!skipCache) {
        try {
          const cached = window.localStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as {
              resumeText: string;
              jobDescription?: string;
              critique: ResumeCritique;
            };
            if (
              parsed.resumeText === resumeText &&
              (parsed.jobDescription ?? "") === jobDescription &&
              parsed.critique?.resumeMarkdown
            ) {
              setCritique(parsed.critique);
              setSelectedKey(initialKey(parsed.critique));
              setIsLoading(false);
              return;
            }
          }
        } catch {
          /* ignore */
        }
      }

      setIsLoading(true);
      setError(null);
      setCritique(null);
      setSelectedKey(null);

      try {
        const result = await analyzeResumeCritique(resumeText, jobDescription);
        setCritique(result);
        setSelectedKey(initialKey(result));
        try {
          window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ resumeText, jobDescription, critique: result }),
          );
        } catch {
          /* storage full */
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to analyze resume",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [resumeText, jobDescription],
  );

  useEffect(() => {
    runCritique(false);
  }, [runCritique]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {/* The app header already says "Resume Critic", so this row only carries context and actions */}
        <p className="flex-1 min-w-0 text-sm text-gray-600 dark:text-dark-text-secondary">
          {jobDescription ? "Critiqued against your target job · " : ""}Click
          any section for specific fixes
          <span className="hidden lg:inline">
            {" "}
            · ← → to step through issues
          </span>
        </p>
        {critique && !isLoading && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrepareResume(critique)}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate LaTeX Resume
            </button>
            <button
              type="button"
              onClick={() => runCritique(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
              title="Re-run analysis"
              aria-label="Re-run analysis"
            >
              <RefreshCw className="w-4 h-4 text-gray-500 dark:text-dark-text-secondary" />
            </button>
          </div>
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
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Analysis failed
              </p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {error}
              </p>
              <button
                onClick={() => runCritique(true)}
                className="btn-primary text-sm px-4 py-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && critique && (
        <div className="space-y-5">
          <ScoreBar
            score={critique.overallScore}
            redFlags={critique.topRedFlags}
            quickWins={critique.quickWins}
            missingKeywords={critique.missingKeywords}
          />

          {/* Resume doc (left) + critique sidebar (right); stacked on mobile */}
          {/* grid-cols-1 = minmax(0,1fr): without it the implicit column grows to the widest line and overflows phones */}
          <div className="grid grid-cols-1 gap-5 items-start lg:grid-cols-[minmax(0,1fr)_380px]">
            <ResumeDocument
              markdown={critique.resumeMarkdown}
              sections={critique.sections}
              selectedKey={selectedKey}
              activeQuote={activeQuote}
              onSectionClick={handleDocSectionClick}
            />
            <div
              ref={sidebarRef}
              className="scroll-mt-24 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
            >
              <CritiqueSidebar
                critique={critique}
                selectedKey={selectedKey}
                onSectionSelect={setSelectedKey}
                onActiveQuoteChange={setActiveQuote}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
