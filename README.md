# AdaptMyCV

Tailor your resume instantly for any job opportunity. AdaptMyCV analyzes your resume against job descriptions, generates tailored cover letters, builds ATS-optimized LaTeX resumes, and surfaces matching job listings — all in one flow.

## Features

- **Resume Upload** — PDF and DOCX/DOC support with drag-and-drop
- **Job URL or Paste** — Fetch a job description directly from a URL or paste it manually
- **AI Match Analysis** — Match score, hard skills, soft skills, and missing skills breakdown
- **Cover Letter Generator** — Four writing styles: Direct, Traditional, Natural, and Personal
- **Resume Studio** — ATS-optimized LaTeX resume tailored to the role, with a live PDF preview and an in-browser section editor
- **Matching Jobs Sidebar** — Fetches real job listings based on your resume and applies country, date, employment type, and remote filters
- **Session Persistence** — All state (resume text, analysis, studio edits) survives a page refresh via localStorage
- **Dark/Light Theme** — Full theme support with a minimal, clean UI

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| AI | OpenRouter (default: `google/gemini-2.0-flash-001`) |
| PDF parsing | pdfjs-dist |
| DOCX parsing | mammoth |
| Job listings | JSearch via RapidAPI |
| LaTeX compile | latexonline.cc |
| Tests | Vitest + jsdom + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai) API key
- (Optional) A [RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) key for the job-matching sidebar

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the project root:

```env
VITE_OPENROUTER_API_KEY=your_openrouter_key_here
VITE_OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
VITE_OPENROUTER_MODEL=google/gemini-2.0-flash-001   # optional, this is the default
VITE_RAPIDAPI_KEY=your_rapidapi_key_here             # optional, enables job sidebar
```

The app runs without `VITE_RAPIDAPI_KEY` — the job sidebar simply won't appear.

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Tests

```bash
npm test           # run once
npm run test:watch # watch mode
npm run test:ui    # Vitest UI
```

39 unit tests covering section parsing, LaTeX extraction, and edge cases.

## Project Structure

```
src/
├── components/
│   ├── ResumeUploader.tsx       # drag-drop upload with MIME + extension validation
│   ├── JobDescriptionInput.tsx  # paste or fetch from URL via Jina reader proxy
│   ├── AnalysisResults.tsx      # match score, skills, cover letters
│   └── TailoredResumePrep.tsx  # Resume Studio (LaTeX editor + live PDF preview)
├── services/
│   ├── openrouter.ts            # AI API calls, PDF/DOCX extraction, retry logic
│   └── jobs.ts                  # JSearch job listing API
├── lib/
│   ├── resumeSections.ts        # section parse/replace/rebuild utilities
│   ├── latexParser.ts           # extractLatexFromResponse (fence-stripping, fallback)
│   └── __tests__/               # unit tests
├── test/
│   └── setup.ts                 # jest-dom setup for Vitest
├── App.tsx                      # app shell, routing between steps, sidebar
└── main.tsx                     # entry point
```

## User Flow

```
Upload Resume → Enter Job Description → Analysis Results → (optional) Resume Studio
                                                    ↓
                                          Cover Letters (4 styles)
                                          Job Matching Sidebar
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `VITE_OPENROUTER_API_URL` | Yes | OpenRouter endpoint |
| `VITE_OPENROUTER_MODEL` | No | Model ID (default: `google/gemini-2.0-flash-001`) |
| `VITE_RAPIDAPI_KEY` | No | RapidAPI key for JSearch job listings |

## Resilience & Error Handling

- **Request timeouts**: 60 s for AI calls, 30 s for URL fetches, 20 s for job listings
- **Rate-limit retry**: exponential backoff with `Retry-After` header support for 429s
- **LaTeX format fallback**: handles raw LaTeX output, markdown-fenced output, and missing XML tags from the AI
- **Section parsing**: matches both `\section*{...}` and `\section{...}` (AI output varies)
- **Concurrent generation protection**: rapid Regenerate clicks can't cause stale results to overwrite newer ones
- **DOCX validation**: checks both MIME type and file extension (some browsers report `.docx` as `application/zip`)

## Troubleshooting

**API key not working**
- Confirm `VITE_OPENROUTER_API_KEY` is set in `.env.local` (not `.env`)
- Restart the dev server after editing `.env.local`

**Resume Studio shows empty sections**
- The AI occasionally outputs `\section{...}` without the asterisk — the parser handles both; if sections are still empty a yellow warning banner will appear with instructions
- Click **Regenerate** to get a fresh attempt

**PDF preview blank or error**
- The preview compiles via latexonline.cc; a LaTeX syntax error in the generated document will show an error page in the iframe — use the **Download .tex** button and compile locally with `xelatex` for full diagnostics

**Job sidebar missing**
- Add `VITE_RAPIDAPI_KEY` to `.env.local` and restart

**File rejected on upload**
- Supported formats: PDF, DOCX, DOC (max 10 MB)

## License

MIT

---

Built by [Abel Beyene](https://abelbeyene.dev)
