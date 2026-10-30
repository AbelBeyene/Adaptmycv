import { createContext, useContext, useEffect, useRef } from "react";
import type { ResumeDocSection } from "../../services/openrouter";
import { escapeRegex } from "../../lib/resumeSections";

interface ResumeDocumentProps {
  markdown: string;
  sections: ResumeDocSection[];
  selectedKey: string | null;
  activeQuote: string; // the finding shown in the sidebar; highlighted more strongly than other issues
  onSectionClick: (key: string) => void;
}

const ActiveQuoteContext = createContext("");

function normalizeQuote(text: string): string {
  return text.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

// ─── markdown block parsing ───────────────────────────────────────────────────

interface MarkdownBlock {
  heading: string | null; // null = preamble (name/contact)
  body: string;
}

function parseBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  let heading: string | null = null;
  let acc: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      blocks.push({ heading, body: acc.join("\n").trim() });
      heading = line.slice(3).trim();
      acc = [];
    } else {
      acc.push(line);
    }
  }
  blocks.push({ heading, body: acc.join("\n").trim() });
  return blocks.filter((b) => b.heading !== null || b.body);
}

function matchSection(
  heading: string | null,
  sections: ResumeDocSection[],
): ResumeDocSection | undefined {
  if (!heading)
    return (
      sections.find((s) => s.key === "contact") ??
      sections.find((s) => /contact/i.test(s.title))
    );
  const h = heading.toLowerCase();
  // Exact title wins over a partial match ("Experience" must not grab "Volunteer Experience")
  return (
    sections.find((s) => s.title.toLowerCase() === h) ??
    sections.find(
      (s) =>
        s.title.toLowerCase().includes(h) || h.includes(s.title.toLowerCase()),
    )
  );
}

// ─── inline text: bold + quote underline ─────────────────────────────────────

function InlineText({ text, quotes }: { text: string; quotes: string[] }) {
  // Split on **bold** spans
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {boldParts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={i}
              className="font-semibold text-gray-900 dark:text-white"
            >
              <QuoteUnderline text={part.slice(2, -2)} quotes={quotes} />
            </strong>
          );
        }
        return <QuoteUnderline key={i} text={part} quotes={quotes} />;
      })}
    </>
  );
}

// Case-insensitive and whitespace-tolerant, since the Markdown may re-wrap or re-case the original text
function quotePattern(quote: string): string {
  return escapeRegex(quote.replace(/\*/g, "").trim()).replace(/\s+/g, "\\s+");
}

// Underlines problem quotes with a yellow underline
function QuoteUnderline({ text, quotes }: { text: string; quotes: string[] }) {
  const activeQuote = useContext(ActiveQuoteContext);
  const valid = quotes.filter((q) => q.length > 3);
  if (!valid.length) return <>{text}</>;

  // One capture group, so odd indexes are the matched quotes
  const parts = text.split(
    new RegExp(`(${valid.map(quotePattern).join("|")})`, "gi"),
  );
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            className={`underline decoration-yellow-400 dark:decoration-yellow-500 decoration-2 underline-offset-2 cursor-default transition-colors ${
              activeQuote && normalizeQuote(part) === activeQuote
                ? "bg-yellow-200/80 dark:bg-yellow-500/25 rounded-sm"
                : ""
            }`}
            title="Issue flagged"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// ─── line type detection & rendering ─────────────────────────────────────────

// Lines matching "**Title** · Company · Date" or "**Title** — Company — Date"
function parseRoleLine(line: string) {
  const m = line.match(/^\*\*(.+?)\*\*\s*[·\-–—]\s*(.+)$/);
  if (!m) return null;
  // Split the rest on · or – to separate company from date
  const rest = m[2];
  const parts = rest.split(/\s*[·\-–—]\s*/);
  const company = parts[0]?.trim() ?? "";
  const date = parts.slice(1).join(" · ").trim();
  return { title: m[1].trim(), company, date };
}

function RoleLine({ line, quotes }: { line: string; quotes: string[] }) {
  const parsed = parseRoleLine(line);
  if (!parsed) {
    return (
      <p className="text-sm text-gray-700 dark:text-dark-text-secondary mt-2">
        <InlineText text={line} quotes={quotes} />
      </p>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3 mt-3 mb-0.5 flex-wrap">
      <span className="font-semibold text-[15px] text-gray-900 dark:text-white leading-tight">
        <QuoteUnderline text={parsed.title} quotes={quotes} />
      </span>
      <div className="flex items-baseline gap-3 text-sm sm:ml-auto">
        {parsed.company && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            <QuoteUnderline text={parsed.company} quotes={quotes} />
          </span>
        )}
        {parsed.date && (
          <span className="text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
            {parsed.date}
          </span>
        )}
      </div>
    </div>
  );
}

function SkillChips({ line, quotes }: { line: string; quotes: string[] }) {
  const activeQuote = useContext(ActiveQuoteContext);
  const skills = line
    .split(/[,;|]/)
    .map((s) => s.replace(/\*\*/g, "").trim())
    .filter(Boolean);
  if (skills.length < 2)
    return (
      <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
        {line}
      </p>
    );

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {skills.map((skill, i) => {
        // A quote can be one skill ("Teamwork") or a run of this line ("React, TypeScript"),
        // but a quote from elsewhere that merely mentions "React" must not flag the chip
        const hit = (q: string) => {
          const nq = normalizeQuote(q);
          const ns = normalizeQuote(skill);
          return (
            nq.length > 3 &&
            (ns.includes(nq) ||
              (nq.includes(ns) && normalizeQuote(line).includes(nq)))
          );
        };
        const flagged = quotes.some(hit);
        const active = !!activeQuote && hit(activeQuote);
        return (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full border ${active ? "ring-2 ring-yellow-400/70 " : ""}${
              flagged
                ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300"
                : "border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary"
            }`}
          >
            {skill}
          </span>
        );
      })}
    </div>
  );
}

function BodyContent({
  body,
  quotes,
  isSkillsSection,
}: {
  body: string;
  quotes: string[];
  isSkillsSection: boolean;
}) {
  if (!body) return null;
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="space-y-1 ml-1 mt-1">
        {listItems.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm text-gray-600 dark:text-dark-text-secondary leading-snug"
          >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
            <InlineText text={item} quotes={quotes} />
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed.startsWith("# ")) {
      flushList();
      // Name heading
      elements.push(
        <h1
          key={elements.length}
          className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
        >
          <QuoteUnderline text={trimmed.slice(2)} quotes={quotes} />
        </h1>,
      );
    } else if (isSkillsSection) {
      flushList();
      elements.push(
        <SkillChips key={elements.length} line={trimmed} quotes={quotes} />,
      );
    } else if (trimmed.match(/^\*\*.+\*\*/)) {
      // Role / degree lines
      flushList();
      elements.push(
        <RoleLine key={elements.length} line={trimmed} quotes={quotes} />,
      );
    } else {
      flushList();
      elements.push(
        <p
          key={elements.length}
          className="text-sm text-gray-600 dark:text-dark-text-secondary leading-relaxed mt-0.5"
        >
          <InlineText text={trimmed} quotes={quotes} />
        </p>,
      );
    }
  }
  flushList();
  return <div>{elements}</div>;
}

// ─── section status colours ───────────────────────────────────────────────────

function sectionAccent(
  status: ResumeDocSection["status"] | undefined,
  selected: boolean,
) {
  const ring = selected
    ? "ring-2 ring-offset-2 dark:ring-offset-dark-card "
    : "";
  if (status === "pass")
    return `${ring}border-l-green-400 dark:border-l-green-500 ring-green-300`;
  if (status === "warn")
    return `${ring}border-l-amber-400 dark:border-l-amber-500 ring-amber-300`;
  if (status === "fail")
    return `${ring}border-l-red-400 dark:border-l-red-500 ring-red-300`;
  return `border-l-gray-200 dark:border-l-gray-700`;
}

function statusDot(status: ResumeDocSection["status"] | undefined) {
  if (status === "pass") return "bg-green-500";
  if (status === "warn") return "bg-amber-500";
  if (status === "fail") return "bg-red-500";
  return "bg-gray-300";
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function ResumeDocument({
  markdown,
  sections,
  selectedKey,
  activeQuote,
  onSectionClick,
}: ResumeDocumentProps) {
  const blocks = parseBlocks(markdown);
  const blockSections = blocks.map((block) =>
    matchSection(block.heading, sections),
  );
  const unplaced = sections.filter((s) => !blockSections.includes(s));
  // Missing sections (usually Summary) belong under the name/contact block, not at the end
  const insertAt = blocks[0]?.heading === null ? 1 : 0;

  // Desktop: keep the section picked via the sidebar (Prev/Next, issue list) in view.
  // Compares with the previous key (not a "first run" flag) so StrictMode's double effect can't scroll on load.
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());
  const prevKey = useRef(selectedKey);
  useEffect(() => {
    const previous = prevKey.current;
    prevKey.current = selectedKey;
    if (!selectedKey || previous === selectedKey) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    sectionRefs.current
      .get(selectedKey)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedKey]);

  const interactiveProps = (key: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selectedKey === key,
    ref: (el: HTMLDivElement | null) => {
      if (el) sectionRefs.current.set(key, el);
      else sectionRefs.current.delete(key);
    },
    onClick: () => onSectionClick(key),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSectionClick(key);
      }
    },
  });

  const renderBlock = (block: MarkdownBlock, i: number) => {
    const matched = blockSections[i];
    const isSelected = !!matched && selectedKey === matched.key;
    const quotes = matched?.findings.map((f) => f.quote).filter(Boolean) ?? [];
    const isSkills = !!(
      matched?.key === "skills" ||
      matched?.title.toLowerCase().includes("skill")
    );
    const clickable = !!matched;

    return (
      <div
        key={`block-${i}`}
        {...(clickable ? interactiveProps(matched.key) : {})}
        className={`rounded-lg border-l-4 pl-4 pr-3 py-3 transition-all duration-150 ${sectionAccent(matched?.status, isSelected)} ${
          clickable
            ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-card-hover focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-dark-card-hover"
            : ""
        }`}
      >
        {/* Section heading */}
        {block.heading && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                {matched && (
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(matched.status)}`}
                  />
                )}
                <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                  {block.heading}
                </h2>
              </div>
              {matched && (
                <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {matched.score}/10
                </span>
              )}
            </div>
            <div className="border-t border-gray-100 dark:border-dark-border mb-3" />
          </>
        )}

        {/* Body */}
        <BodyContent
          body={block.body}
          quotes={quotes}
          isSkillsSection={isSkills}
        />

        {/* Click hint */}
        {matched && matched.findings.length > 0 && !isSelected && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2.5">
            {matched.findings.length} issue
            {matched.findings.length > 1 ? "s" : ""} · click to review
          </p>
        )}
      </div>
    );
  };

  // Sections the critique covers but the resume doesn't have (or that couldn't be placed)
  const renderPlaceholder = (section: ResumeDocSection) => (
    <div
      key={`missing-${section.key}`}
      {...interactiveProps(section.key)}
      className={`rounded-lg border-l-4 border border-dashed border-gray-200 dark:border-dark-border pl-4 pr-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-card-hover focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-dark-card-hover transition-all duration-150 ${sectionAccent(section.status, selectedKey === section.key)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(section.status)}`}
          />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
            {section.title}
          </h2>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
          {section.score}/10
        </span>
      </div>
      <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-2">
        {section.missing ? "Missing from your resume" : "Feedback on this area"}
        {section.findings.length > 0 && " · click to review"}
      </p>
    </div>
  );

  return (
    <ActiveQuoteContext.Provider value={normalizeQuote(activeQuote)}>
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
        {/* Top accent stripe */}
        <div className="h-1 bg-gray-200 dark:bg-dark-border" />

        <div className="p-4 sm:p-6 space-y-4 break-words">
          {blocks.slice(0, insertAt).map((block, i) => renderBlock(block, i))}
          {unplaced.map(renderPlaceholder)}
          {blocks
            .slice(insertAt)
            .map((block, i) => renderBlock(block, i + insertAt))}
        </div>
      </div>
    </ActiveQuoteContext.Provider>
  );
}
