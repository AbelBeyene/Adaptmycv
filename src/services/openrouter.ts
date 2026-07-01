import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import atsResumeTemplate from '../../template_ATS_resume.tex?raw'
import { extractLatexFromResponse } from '../lib/latexParser'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const API_KEYS: string[] = [
  import.meta.env.VITE_OPENROUTER_API_KEY,
  import.meta.env.VITE_OPENROUTER_API_KEY_2,
].filter(Boolean)

const API_URL = import.meta.env.VITE_OPENROUTER_API_URL
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash'

if (API_KEYS.length === 0 || !API_URL) {
  console.error('Missing API credentials. Check your .env.local file.')
} else {
  console.log(`API ready: ${API_KEYS.length} key(s) available.`)
}

export interface AnalysisData {
  matchScore: number
  hardSkillsMatch: string[]
  softSkillsMatch: string[]
  missingSkills: string[]
  recommendations: string[]
}

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const OPENROUTER_MAX_RETRIES = 5
const OPENROUTER_BASE_RETRY_DELAY_MS = 3000

// Groq free tier: 12,000 TPM. Each call uses ~4,000–8,000 tokens.
// Cap inputs to stay under the limit across sequential calls.
const MAX_RESUME_CHARS = 3000
const MAX_JOB_DESC_CHARS = 3000

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n[...truncated for token limit]'
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) {
    return null
  }

  const asSeconds = Number(retryAfterHeader)
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000
  }

  const asDate = Date.parse(retryAfterHeader)
  if (Number.isNaN(asDate)) {
    return null
  }

  return Math.max(0, asDate - Date.now())
}

function getFriendlyOpenRouterErrorMessage(message: string): string {
  if (message.includes('API error: 429')) {
    return 'The AI provider is rate-limiting requests right now. Please wait a moment and try again.'
  }

  if (message.includes('API error: 400')) {
    return 'The AI provider rejected this request format. Please try again in a moment.'
  }

  if (message.includes('API error: 401')) {
    return 'Invalid API key. Please check your OpenRouter API credentials.'
  }

  if (message.includes('API error: 404')) {
    return 'The selected AI model is unavailable on OpenRouter. Update VITE_OPENROUTER_MODEL in your environment variables.'
  }

  if (message.includes('API error: 5')) {
    return 'The AI provider is experiencing issues. Please try again in a moment.'
  }

  if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('timed out') || message.includes('AbortError')) {
    return 'The request timed out. Please check your connection and try again.'
  }

  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror')) {
    return 'Network error — please check your internet connection and try again.'
  }

  return `API call failed: ${message}`
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (part && typeof part === 'object') {
          const record = part as Record<string, unknown>
          if (typeof record.text === 'string') {
            return record.text
          }
          if (typeof record.content === 'string') {
            return record.content
          }
        }

        return ''
      })
      .join('')
  }

  if (content && typeof content === 'object') {
    const record = content as Record<string, unknown>

    if (typeof record.text === 'string') {
      return record.text
    }

    if (typeof record.content === 'string') {
      return record.content
    }
  }

  return ''
}

async function callOpenRouterAPI(messages: OpenRouterMessage[], requireJson = false): Promise<string> {
  try {
    if (API_KEYS.length === 0 || !API_URL) {
      throw new Error('API credentials not configured')
    }

    // Each attempt can use a different key — round-robin on rate limit
    let keyIndex = 0
    console.log(`Calling API... model=${MODEL} keys=${API_KEYS.length}`)

    for (let attempt = 0; attempt <= OPENROUTER_MAX_RETRIES; attempt += 1) {
      const apiKey = API_KEYS[keyIndex % API_KEYS.length]

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AdaptMyCV',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          ...(requireJson ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Response Error:', errorText)

        if (response.status === 429 && attempt < OPENROUTER_MAX_RETRIES) {
          // Rotate to the next key immediately before waiting
          keyIndex += 1
          const usingFallback = API_KEYS.length > 1 && keyIndex % API_KEYS.length !== 0
          if (usingFallback) {
            console.warn(`Rate limited on key ${keyIndex}. Switching to key ${(keyIndex % API_KEYS.length) + 1}...`)
          }

          // Prefer Retry-After header, then parse Groq's "try again in Xs" message
          let backoffMs = parseRetryAfterMs(response.headers.get('retry-after'))
          if (!backoffMs) {
            try {
              const body = JSON.parse(errorText)
              const match = (body?.error?.message as string | undefined)?.match(/try again in (\d+\.?\d*)s/i)
              if (match) backoffMs = Math.ceil(parseFloat(match[1]) * 1000) + 500
            } catch { /* ignore */ }
          }
          // If we rotated to a fresh key, no need to wait as long
          backoffMs ??= usingFallback ? 500 : OPENROUTER_BASE_RETRY_DELAY_MS * (attempt + 1)
          console.warn(`Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${OPENROUTER_MAX_RETRIES})`)
          await wait(backoffMs)
          continue
        }

        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const primaryMessage = data?.choices?.[0]?.message
      const directContent = extractTextFromContent(primaryMessage?.content)

      if (directContent.trim()) {
        return directContent
      }

      const fallbackText =
        extractTextFromContent(data?.choices?.[0]?.text) ||
        extractTextFromContent(data?.output_text) ||
        extractTextFromContent(data?.response?.output_text)

      if (fallbackText.trim()) {
        return fallbackText
      }

      console.error('Unexpected OpenRouter response payload:', data)
      throw new Error('Invalid response format from OpenRouter')
    }

    throw new Error('API error: 429 Too Many Requests')
  } catch (error) {
    console.error('OpenRouter API error:', error)
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('The request timed out. Please check your connection and try again.')
    }
    if (error instanceof Error) {
      throw new Error(getFriendlyOpenRouterErrorMessage(error.message))
    }
    throw error
  }
}

function extractJsonCandidate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstObject = trimmed.indexOf('{')
  const lastObject = trimmed.lastIndexOf('}')
  if (firstObject !== -1 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1)
  }

  const firstArray = trimmed.indexOf('[')
  const lastArray = trimmed.lastIndexOf(']')
  if (firstArray !== -1 && lastArray > firstArray) {
    return trimmed.slice(firstArray, lastArray + 1)
  }

  return null
}

async function parseJsonResponse<T>(raw: string, schemaHint: string): Promise<T> {
  const candidate = extractJsonCandidate(raw)
  if (candidate) {
    try {
      return JSON.parse(candidate) as T
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting repair...', parseError)
    }
  }

  const repairPrompt = [
    {
      role: 'system' as const,
      content: 'You repair malformed API outputs into valid JSON. Return only valid JSON with no explanation.',
    },
    {
      role: 'user' as const,
      content: `Convert the following content into valid JSON matching this shape:\n${schemaHint}\n\nCONTENT:\n${raw}`,
    },
  ]

  const repaired = await callOpenRouterAPI(repairPrompt, true)
  const repairedCandidate = extractJsonCandidate(repaired)
  if (!repairedCandidate) {
    throw new Error('Invalid response format from API')
  }

  return JSON.parse(repairedCandidate) as T
}

async function extractPDFText(file: File): Promise<string> {
  try {
    console.log('Extracting PDF text from:', file.name, 'Size:', file.size)
    
    // Convert File to ArrayBuffer for better browser compatibility
    const arrayBuffer = await file.arrayBuffer()
    
    // Use typed array instead of raw buffer for better compatibility
    const typedArray = new Uint8Array(arrayBuffer)
    
    // Load PDF with compatibility options
    const createLoadingTask = (disableWorker: boolean) =>
      pdfjsLib.getDocument({
        data: typedArray,
        // Disable streaming for better browser compatibility
        disableStream: true,
        // Disable range requests which can cause issues in some browsers
        disableRange: true,
        // Fallback path for environments where worker dynamic import is blocked
        disableWorker,
      } as Parameters<typeof pdfjsLib.getDocument>[0])

    let loadingTask = createLoadingTask(false)
    let pdf

    try {
      pdf = await loadingTask.promise
    } catch (workerError) {
      const message = workerError instanceof Error ? workerError.message : String(workerError)
      const shouldFallback =
        message.toLowerCase().includes('fake worker') ||
        message.toLowerCase().includes('dynamically imported module') ||
        message.toLowerCase().includes('setting up fake worker failed')

      if (!shouldFallback) {
        throw workerError
      }

      console.warn('PDF worker failed, retrying without worker:', message)
      loadingTask = createLoadingTask(true)
      pdf = await loadingTask.promise
    }

    console.log('PDF loaded, pages:', pdf.numPages)
    const textPages: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      textPages.push(pageText)
    }

    const extractedText = textPages.join('\n\n')
    console.log('PDF extraction complete, text length:', extractedText.length)
    
    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from PDF')
    }
    
    return extractedText
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function extractDOCXText(file: File): Promise<string> {
  try {
    console.log('Extracting DOCX text from:', file.name)
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    console.log('DOCX extraction complete, text length:', result.value.length)
    
    if (!result.value.trim()) {
      throw new Error('No text could be extracted from DOCX')
    }
    
    return result.value
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function extractResumeText(file: File): Promise<string> {
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()

  console.log('Extracting resume text, file type:', fileType, 'file name:', fileName)

  if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
    return await extractPDFText(file)
  } else if (
    fileType.includes('word') ||
    fileType.includes('document') ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    return await extractDOCXText(file)
  } else {
    throw new Error('Unsupported file format. Please upload a PDF or DOCX file.')
  }
}

export async function extractJobDescriptionFromUrl(jobUrl: string): Promise<string> {
  try {
    const trimmedUrl = jobUrl.trim()
    if (!trimmedUrl) {
      throw new Error('Job link is required')
    }

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`
    const readableProxyUrl = `https://r.jina.ai/${normalizedUrl}`

    const response = await fetch(readableProxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      throw new Error(`Unable to fetch job description (${response.status})`)
    }

    const rawText = await response.text()
    const cleanedText = rawText
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
      .trim()

    if (cleanedText.length < 50) {
      throw new Error('Fetched content is too short. Please paste the job description manually.')
    }

    return cleanedText.slice(0, MAX_JOB_DESC_CHARS)
  } catch (error) {
    console.error('Job URL extraction error:', error)
    throw new Error(
      `Failed to fetch job description from link: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export async function analyzeResumeJobMatch(
  resumeText: string,
  jobDescription: string
): Promise<AnalysisData> {
  const resume = truncate(resumeText, MAX_RESUME_CHARS)
  const jobDesc = truncate(jobDescription, MAX_JOB_DESC_CHARS)

  const analysisPrompt = `You are an expert resume optimizer and recruiter. Analyze the following resume against the job description and provide detailed analysis in JSON format.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDesc}

Provide your response as a JSON object with exactly this structure (no markdown, just JSON):
{
  "matchScore": <number 0-100>,
  "hardSkillsMatch": [<array of matched technical skills>],
  "softSkillsMatch": [<array of matched soft skills>],
  "missingSkills": [<array of important missing skills from resume>],
  "recommendations": [<array of 4-5 specific, actionable recommendations to improve match>]
}

Requirements:
- matchScore should be realistic based on actual comparison
- Include only skills explicitly mentioned or clearly inferable
- Recommendations should be specific and actionable
- Focus on what matters most for the job
- Return ONLY valid JSON, no additional text`

  try {
    console.log('Sending analysis prompt to API...')
    const response = await callOpenRouterAPI(
      [{ role: 'user', content: analysisPrompt }],
      true
    )
    console.log('Received analysis response, length:', response.length)
    const analysis = await parseJsonResponse<AnalysisData>(
      response,
      `{
  "matchScore": 0,
  "hardSkillsMatch": ["skill"],
  "softSkillsMatch": ["skill"],
  "missingSkills": ["skill"],
  "recommendations": ["recommendation"]
}`
    )
    console.log('Parsed analysis:', analysis)

    if (
      typeof analysis.matchScore !== 'number' ||
      !Array.isArray(analysis.hardSkillsMatch) ||
      !Array.isArray(analysis.softSkillsMatch) ||
      !Array.isArray(analysis.missingSkills) ||
      !Array.isArray(analysis.recommendations)
    ) {
      throw new Error('Invalid response structure from API')
    }

    return {
      ...analysis,
      matchScore: Math.min(100, Math.max(0, Math.round(analysis.matchScore))),
    }
  } catch (error) {
    console.error('Analysis error:', error)
    throw error
  }
}

export async function generateCustomRecommendations(
  resumeText: string,
  jobDescription: string,
  currentRecommendations: string[]
): Promise<string[]> {
  const resume = truncate(resumeText, MAX_RESUME_CHARS)
  const jobDesc = truncate(jobDescription, MAX_JOB_DESC_CHARS)
  const prompt = `Based on this resume and job description, provide 3 additional specific recommendations to improve the match:

RESUME:
${resume}

JOB DESCRIPTION:
${jobDesc}

Current recommendations:
${currentRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Provide exactly 3 NEW actionable recommendations. Return as a JSON array of strings only:
["recommendation 1", "recommendation 2", "recommendation 3"]`

  try {
    const response = await callOpenRouterAPI([{ role: 'user', content: prompt }], true)
    return await parseJsonResponse<string[]>(
      response,
      `["recommendation 1", "recommendation 2", "recommendation 3"]`
    )
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return []
  }
}

export interface CoverLetterVariants {
  dStyle: string
  tStyle: string
  naturalStyle: string
  personalStyle: string
}

export interface TailoredResumeLatex {
  latex: string
  summary: string
  warnings: string[]
}

const LATEX_ONLINE_BASE_URL = 'https://latexonline.cc/compile'

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string
): Promise<CoverLetterVariants> {
  const resume = truncate(resumeText, MAX_RESUME_CHARS)
  const jobDesc = truncate(jobDescription, MAX_JOB_DESC_CHARS)
  const prompt = `You are a professional career coach and hiring expert.

Write four tailored cover letter versions based on the resume and job description below.
Keep details realistic and do not invent fake achievements.
Return ONLY valid JSON, no markdown and no extra text.

Styles required:
- dStyle: direct and concise style (short, punchy, results-focused)
- tStyle: traditional and formal style (polished, classic business tone)
- naturalStyle: natural, human tone that feels personal and conversational (not robotic)
- personalStyle: personalized storytelling tone with varied sentence structure, no generic template language

Important constraints for naturalStyle and personalStyle:
- Avoid repetitive AI-style phrasing.
- Avoid obvious template language and clichés.
- Use varied sentence length and authentic wording.
- Keep it professional and role-specific.

Both versions must use this structure:
Dear Hiring Manager,

<opening paragraph tailored to role>

<body paragraph linking relevant experience to key job requirements>

<body paragraph showing motivation and fit>

Thank you for your consideration.
Sincerely,
<Candidate Name from resume if available, otherwise "Candidate">

Return exactly this JSON structure:
{
  "dStyle": "...",
  "tStyle": "...",
  "naturalStyle": "...",
  "personalStyle": "..."
}

JOB DESCRIPTION:
${jobDesc}

RESUME:
${resume}`

  try {
    const response = await callOpenRouterAPI([{ role: 'user', content: prompt }], true)
    const parsed = await parseJsonResponse<CoverLetterVariants>(
      response,
      `{
  "dStyle": "text",
  "tStyle": "text",
  "naturalStyle": "text",
  "personalStyle": "text"
}`
    )
    if (
      typeof parsed.dStyle !== 'string' ||
      typeof parsed.tStyle !== 'string' ||
      typeof parsed.naturalStyle !== 'string' ||
      typeof parsed.personalStyle !== 'string'
    ) {
      throw new Error('Invalid cover letter structure from API')
    }

    return {
      dStyle: parsed.dStyle.trim(),
      tStyle: parsed.tStyle.trim(),
      naturalStyle: parsed.naturalStyle.trim(),
      personalStyle: parsed.personalStyle.trim(),
    }
  } catch (error) {
    console.error('Error generating cover letter:', error)
    throw error
  }
}

export async function generateTailoredResumeLatex(
  resumeText: string,
  jobDescription: string
): Promise<TailoredResumeLatex> {
  const resume = truncate(resumeText, MAX_RESUME_CHARS)
  const jobDesc = truncate(jobDescription, MAX_JOB_DESC_CHARS)
  const prompt = `You are an expert resume writer, ATS optimizer, and LaTeX formatter.

Create a professional ATS-friendly resume in LaTeX based ONLY on the candidate information found in the resume below, tailored to the target job description.

You MUST use the provided LaTeX template as the base format. Preserve its overall structure, commands, section order, visual style, and ATS-friendly formatting unless a tiny adjustment is required for correctness or factual fit.

Hard safety rules:
- Do not invent employers, job titles, dates, degrees, certifications, projects, awards, locations, metrics, technologies, or achievements.
- You may reorganize, shorten, clarify, and emphasize existing experience.
- You may only mention skills, tools, and responsibilities that are explicitly present in the source resume or are directly supported by it.
- If something is missing, omit it instead of guessing.
- Maximize ATS alignment with the job description by prioritizing exact relevant keywords that already fit the candidate's real background.
- Keep every claim truthful, concrete, and supportable from the source resume.

Output requirements:
- The LaTeX must compile as a standalone document.
- Follow the supplied template's layout and helper commands.
- Replace placeholder content with candidate-specific content.
- Keep ATS-friendly section headings and plain text content.
- Keep the formatting simple and machine-readable.
- Escape LaTeX-sensitive characters correctly (%, &, $, #, _, ^, ~, {, }).
- If a section in the template has no supported source information, keep the document valid and either omit that content carefully or use only truthful minimal content.

IMPORTANT: Respond using ONLY this exact format with these XML tags — no other text before or after:

<summary>1-2 sentence summary of the tailoring approach used</summary>
<warnings>["optional factual caution or missing-info note"]</warnings>
<latex>
\\documentclass...complete LaTeX document...\\end{document}
</latex>

JOB DESCRIPTION:
${jobDesc}

LATEX TEMPLATE TO FOLLOW:
${atsResumeTemplate}

SOURCE RESUME:
${resume}`

  try {
    const response = await callOpenRouterAPI([{ role: 'user', content: prompt }], false)

    const latex = extractLatexFromResponse(response)
    if (!latex) {
      throw new Error(
        'The AI did not return a valid LaTeX document. Please try regenerating — the model occasionally skips the required format.'
      )
    }

    const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/i)
    const warningsMatch = response.match(/<warnings>([\s\S]*?)<\/warnings>/i)
    const summaryRaw = summaryMatch?.[1]?.trim() ?? ''
    const warningsRaw = warningsMatch?.[1]?.trim() ?? '[]'

    let warnings: string[] = []
    try {
      const candidate = extractJsonCandidate(warningsRaw)
      if (candidate) {
        const parsed = JSON.parse(candidate)
        if (Array.isArray(parsed)) {
          warnings = parsed.filter((item: unknown) => typeof item === 'string')
        }
      }
    } catch {
      // non-critical — proceed with empty warnings
    }

    return {
      summary: summaryRaw || 'Resume tailored to the job description using the ATS template.',
      warnings,
      latex,
    }
  } catch (error) {
    console.error('Error generating tailored resume LaTeX:', error)
    throw error
  }
}

export interface CritiqueSection {
  key: string
  title: string
  score: number
  status: 'pass' | 'warn' | 'fail'
  findings: string[]
  suggestions: string[]
}

export interface ResumeCritique {
  overallScore: number
  sections: CritiqueSection[]
  topRedFlags: string[]
  quickWins: string[]
}

export async function analyzeResumeCritique(resumeText: string): Promise<ResumeCritique> {
  const resume = truncate(resumeText, MAX_RESUME_CHARS)

  const prompt = `You are a senior recruiter and resume expert. Critically evaluate this resume across 11 professional criteria. Be direct and specific — reference actual content from the resume.

RESUME:
${resume}

Respond with ONLY valid JSON, no markdown, no extra text:

{
  "overallScore": <weighted average 0-100>,
  "sections": [
    {"key":"contact","title":"Contact & Basic Info","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[<up to 3 specific observations>],"suggestions":[<up to 3 actionable fixes>]},
    {"key":"formatting","title":"Formatting & ATS Compatibility","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"summary","title":"Professional Summary","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"experience","title":"Work Experience","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"gaps","title":"Employment Gaps","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"keywords","title":"Keywords & Relevance","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"skills","title":"Skills Section","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"education","title":"Education & Certifications","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"redflags","title":"Red Flags","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"tailoring","title":"Tailoring & Personalization","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]},
    {"key":"tone","title":"Tone & Language Quality","score":<0-10>,"status":<"pass"|"warn"|"fail">,"findings":[...],"suggestions":[...]}
  ],
  "topRedFlags": [<up to 3 most critical issues hurting this resume>],
  "quickWins": [<up to 3 high-impact easy improvements>]
}

Scoring: pass=7-10 (meets standard), warn=4-6 (needs work), fail=0-3 (significant problem). For employment gaps: if no gaps exist, score 10 and status pass.`

  const schemaHint = `{
  "overallScore": 0,
  "sections": [{"key":"contact","title":"","score":0,"status":"pass","findings":[],"suggestions":[]}],
  "topRedFlags": [],
  "quickWins": []
}`

  const response = await callOpenRouterAPI([{ role: 'user', content: prompt }], true)
  const parsed = await parseJsonResponse<ResumeCritique>(response, schemaHint)

  if (
    typeof parsed.overallScore !== 'number' ||
    !Array.isArray(parsed.sections) ||
    !Array.isArray(parsed.topRedFlags) ||
    !Array.isArray(parsed.quickWins)
  ) {
    throw new Error('Invalid critique response structure from API')
  }

  return {
    ...parsed,
    overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore))),
  }
}

export function buildLatexPdfUrl(latex: string, filename = 'adapted-harvard-resume.pdf'): string {
  const params = new URLSearchParams({
    text: latex,
    command: 'xelatex',
    force: 'true',
    download: filename,
  })

  return `${LATEX_ONLINE_BASE_URL}?${params.toString()}`
}
