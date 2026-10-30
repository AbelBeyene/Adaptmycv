import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Lightbulb,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  buildLatexPdfUrl,
  generateTailoredResumeLatex,
  TailoredResumeLatex,
} from "../services/openrouter";
import {
  allSectionsEmpty,
  EMPTY_SECTIONS,
  parseResumeSections,
  rebuildLatexFromSections,
  SECTION_ORDER,
  type ResumeSections,
} from "../lib/resumeSections";
import { latexToHtml, replaceTextRun } from "../lib/latexToHtml";
import type { ResumeCritique } from "../lib/critique";

interface TailoredResumePrepProps {
  resumeText: string;
  jobDescription: string;
  critique?: ResumeCritique | null;
  onBack: () => void;
}

type EditorPanel = "sections" | "latex" | "ideas";

const STUDIO_CACHE_KEY = "adaptmycv-resume-studio-v1";

// Mirrors the template's look (Carlito ≈ Calibri, A4, ruled section titles); shared by the preview and the print frame
const RESUME_PAGE_CSS = `
.resume-page { background: #fff; color: #111; font-family: Carlito, Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.35; padding: 1.2cm 1.4cm; }
.resume-page h2 { font-size: 1em; font-weight: 700; border-bottom: 1px solid #111; margin: 8px 0 4px; padding-bottom: 1px; }
.resume-page ul { list-style: disc; padding-left: 1.2em; margin: 0 0 4px; }
.resume-page ol { list-style: decimal; padding-left: 1.2em; margin: 0 0 4px; }
.resume-page a { color: inherit; text-decoration: none; }
.resume-page .rs-row { display: flex; justify-content: space-between; gap: 1em; }
.resume-page .rs-name { font-size: 1.75em; }
.resume-page .rs-lg { font-size: 1.2em; }
.resume-page .rs-par { height: 4px; }
.resume-page [contenteditable] { border-radius: 2px; cursor: text; outline: none; }
.resume-page [contenteditable]:hover { background: #eef2ff; }
.resume-page [contenteditable]:focus { background: #e0e7ff; box-shadow: 0 0 0 1px #6366f1; }
`;

export default function TailoredResumePrep({
  resumeText,
  jobDescription,
  critique,
  onBack,
}: TailoredResumePrepProps) {
  const [tailoredResume, setTailoredResume] =
    useState<TailoredResumeLatex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [activePanel, setActivePanel] = useState<EditorPanel>("sections");
  const [editableLatex, setEditableLatex] = useState("");
  const [sections, setSections] = useState<ResumeSections>(EMPTY_SECTIONS);
  const [sectionsUnparseable, setSectionsUnparseable] = useState(false);
  const critiqueSignature = critique ? JSON.stringify(critique) : "";

  // Prevents stale async results from overwriting a newer generation
  const generationIdRef = useRef(0);

  const generateResume = async () => {
    const myId = ++generationIdRef.current;
    try {
      setIsLoading(true);
      setError(null);
      setTailoredResume(null);
      setEditableLatex("");

      const generatedResume = await generateTailoredResumeLatex(
        resumeText,
        jobDescription,
        critique,
      );
      if (myId !== generationIdRef.current) return;

      const parsedSections = parseResumeSections(generatedResume.latex);
      setTailoredResume(generatedResume);
      setEditableLatex(generatedResume.latex);
      setSections(parsedSections);
      setSectionsUnparseable(allSectionsEmpty(parsedSections));
    } catch (generationError) {
      if (myId !== generationIdRef.current) return;
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate tailored LaTeX resume",
      );
    } finally {
      if (myId === generationIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadTailoredResume = async () => {
      try {
        const cachedStudio = window.localStorage.getItem(STUDIO_CACHE_KEY);
        if (cachedStudio) {
          const parsed = JSON.parse(cachedStudio) as Partial<{
            resumeText: string;
            jobDescription: string;
            tailoredResume: TailoredResumeLatex;
            editableLatex: string;
            activePanel: EditorPanel;
            sections: ResumeSections;
            critiqueSignature?: string;
          }>;

          if (
            parsed.resumeText === resumeText &&
            parsed.jobDescription === jobDescription &&
            parsed.critiqueSignature === critiqueSignature &&
            parsed.tailoredResume &&
            typeof parsed.editableLatex === "string"
          ) {
            const restoredSections =
              parsed.sections || parseResumeSections(parsed.editableLatex);
            setTailoredResume(parsed.tailoredResume);
            setEditableLatex(parsed.editableLatex);
            setSections(restoredSections);
            setSectionsUnparseable(allSectionsEmpty(restoredSections));
            setActivePanel(parsed.activePanel || "sections");
            setIsLoading(false);
            return;
          }
        }
      } catch (cacheError) {
        console.warn("Failed to restore resume studio cache:", cacheError);
      }

      try {
        setIsLoading(true);
        setError(null);
        setTailoredResume(null);
        setEditableLatex("");

        const generatedResume = await generateTailoredResumeLatex(
          resumeText,
          jobDescription,
          critique,
        );
        if (cancelled) {
          return;
        }

        const parsedSections = parseResumeSections(generatedResume.latex);
        setTailoredResume(generatedResume);
        setEditableLatex(generatedResume.latex);
        setSections(parsedSections);
        setSectionsUnparseable(allSectionsEmpty(parsedSections));
      } catch (generationError) {
        if (cancelled) {
          return;
        }

        setError(
          generationError instanceof Error
            ? generationError.message
            : "Failed to generate tailored LaTeX resume",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTailoredResume();

    return () => {
      cancelled = true;
    };
  }, [resumeText, jobDescription, critique]);

  useEffect(() => {
    if (!tailoredResume || !editableLatex.trim()) {
      return;
    }

    try {
      window.localStorage.setItem(
        STUDIO_CACHE_KEY,
        JSON.stringify({
          resumeText,
          jobDescription,
          tailoredResume,
          editableLatex,
          activePanel,
          sections,
          critiqueSignature,
        }),
      );
    } catch (cacheError) {
      console.warn("Failed to persist resume studio cache:", cacheError);
    }
  }, [
    resumeText,
    jobDescription,
    critiqueSignature,
    tailoredResume,
    editableLatex,
    activePanel,
    sections,
  ]);

  // Rendered locally on every edit; the online LaTeX compiler is only hit when the user asks for it
  const previewHtml = useMemo(
    () => latexToHtml(editableLatex, { editable: true }),
    [editableLatex],
  );

  // Print just the resume through a throwaway frame so the browser's "Save as PDF" gets a clean A4 document
  const handleSavePdf = () => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>adapted-resume</title><style>${RESUME_PAGE_CSS}
@page { size: A4; margin: 1.2cm 1.4cm; } body { margin: 0; } .resume-page { padding: 0; }</style></head>
<body><div class="resume-page">${latexToHtml(editableLatex)}</div></body></html>`;
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) return frame.remove();
      win.addEventListener("afterprint", () => frame.remove());
      win.focus();
      win.print();
    };
    document.body.appendChild(frame);
  };

  const handleCopy = async () => {
    if (!editableLatex.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(editableLatex);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy LaTeX resume:", err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!editableLatex.trim()) {
      return;
    }

    const blob = new Blob([editableLatex], {
      type: "text/x-tex;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "adapted-harvard-resume.tex";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  };

  const handleSectionChange = (key: keyof ResumeSections, value: string) => {
    const updatedSections = { ...sections, [key]: value };
    setSections(updatedSections);
    setEditableLatex((currentLatex) =>
      rebuildLatexFromSections(currentLatex, updatedSections),
    );
  };

  // Preview text is edited in place and written back into the LaTeX when the field loses focus;
  // committing per keystroke would re-render the preview and lose the caret.
  const handlePreviewFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    const el = event.target as HTMLElement;
    if (el.dataset.s) el.dataset.original = el.textContent ?? "";
  };

  const handlePreviewBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const el = event.target as HTMLElement;
    const { s, e, original } = el.dataset;
    const text = el.textContent ?? "";
    if (!s || !e || text === original) return;
    handleLatexChange(
      replaceTextRun(editableLatex, Number(s), Number(e), text),
    );
  };

  const handlePreviewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const el = event.target as HTMLElement;
    if (!el.dataset.s) return;
    if (event.key === "Escape")
      el.textContent = el.dataset.original ?? el.textContent;
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      el.blur();
    }
  };

  const handleLatexChange = (value: string) => {
    setEditableLatex(value);
    setSections(parseResumeSections(value));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="section-title mb-2">Prepare Enhanced Resume</h2>
            <p className="section-subtitle">
              Building a template-based LaTeX resume tailored to this role
              without inventing experience.
            </p>
          </div>
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
    );
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
            <p className="section-subtitle mt-1">
              We couldn’t generate the tailored LaTeX resume yet.
            </p>
          </div>
        </div>

        <div className="card border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Generation failed
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                {error || "No tailored resume was generated."}
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
    );
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
            A separate studio for editing LaTeX, previewing the compile, and
            shaping the final resume.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Studio controls
              </p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Work directly in the generated LaTeX or switch to product ideas
                for what this page can evolve into next.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActivePanel("sections")}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  activePanel === "sections"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-gray-100 dark:bg-dark-card border-gray-300 dark:border-dark-border"
                }`}
              >
                Sections
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("latex")}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  activePanel === "latex"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-gray-100 dark:bg-dark-card border-gray-300 dark:border-dark-border"
                }`}
              >
                LaTeX
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("ideas")}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  activePanel === "ideas"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-gray-100 dark:bg-dark-card border-gray-300 dark:border-dark-border"
                }`}
              >
                Ideas
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-dark-border p-4 bg-gray-50 dark:bg-dark-card/50">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Tailoring summary
            </p>
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
                  <p
                    key={warning}
                    className="text-sm text-orange-800 dark:text-orange-300"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {activePanel === "sections" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Section editor
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : copyError ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied
                      ? "Copied"
                      : copyError
                        ? "Copy failed"
                        : "Copy .tex"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Download .tex
                  </button>
                  <button
                    type="button"
                    onClick={generateResume}
                    className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              </div>

              {sectionsUnparseable && (
                <div className="rounded-lg border border-yellow-200 dark:border-yellow-900/40 p-3 bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      Section headings could not be parsed from the generated
                      LaTeX — the sections editor will be empty. Use the LaTeX
                      tab to edit directly, or click Regenerate.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {SECTION_ORDER.map((section) => (
                  <div
                    key={section.key}
                    className="rounded-lg border border-gray-200 dark:border-dark-border p-3 bg-white dark:bg-dark-card"
                  >
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {section.title}
                    </label>
                    <textarea
                      value={sections[section.key as keyof ResumeSections]}
                      onChange={(event) =>
                        handleSectionChange(section.key, event.target.value)
                      }
                      spellCheck={false}
                      className="input-field min-h-28 resize-y font-mono text-xs leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                These sections map back into the current LaTeX document and
                update the preview automatically.
              </p>
            </div>
          ) : activePanel === "latex" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  LaTeX editor
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : copyError ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied
                      ? "Copied"
                      : copyError
                        ? "Copy failed"
                        : "Copy .tex"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Download .tex
                  </button>
                  <button
                    type="button"
                    onClick={generateResume}
                    className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  >
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
                The preview updates as you type.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                "Structured section editing for Summary, Skills, Experience, Projects, and Education instead of raw LaTeX only.",
                "Inline ATS keyword coverage showing matched, missing, and overused job-description terms.",
                "Bullet-level rewrite tools like “tighten”, “shorten”, and “make more ATS-friendly” with truth checks.",
                "Version snapshots for Original, ATS-heavy, one-page, and recruiter-friendly variants.",
                "Compile diagnostics for LaTeX errors, layout overflow, and broken links.",
                "Field locking so company names, dates, and titles can never be changed by AI.",
              ].map((idea) => (
                <div
                  key={idea}
                  className="rounded-lg border border-gray-200 dark:border-dark-border p-3 bg-white dark:bg-dark-card"
                >
                  <div className="flex gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
                      {idea}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Live preview
              </p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Click any text to edit it right here — Enter to keep, Esc to
                undo. Save as PDF uses your browser's print dialog.
              </p>
            </div>
            {previewHtml && (
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSavePdf}
                  className="btn-primary flex items-center gap-1 px-2 py-1 text-xs"
                >
                  <Download className="w-4 h-4" />
                  Save as PDF
                </button>
                <a
                  href={buildLatexPdfUrl(
                    editableLatex,
                    "adapted-harvard-resume.pdf",
                  )}
                  target="_blank"
                  rel="noreferrer"
                  title="Compiles the .tex with the online LaTeX service for exact typesetting"
                  className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                >
                  <FileText className="w-4 h-4" />
                  LaTeX PDF
                </a>
              </div>
            )}
          </div>

          {previewHtml ? (
            <>
              <style>{RESUME_PAGE_CSS}</style>
              <div
                className="resume-page rounded border border-gray-200 dark:border-dark-border min-h-[46rem] overflow-x-auto"
                // Safe: latexToHtml escapes all text and only emits http(s)/mailto links
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                onFocus={handlePreviewFocus}
                onBlur={handlePreviewBlur}
                onKeyDown={handlePreviewKeyDown}
                // Links stay as text while editing; they work in the saved PDF
                onClick={(event) =>
                  (event.target as HTMLElement).closest("a") &&
                  event.preventDefault()
                }
              />
            </>
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
  );
}
