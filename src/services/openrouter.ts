import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import atsResumeTemplate from '../../template_ATS_resume.tex?raw'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const API_URL = import.meta.env.VITE_OPENROUTER_API_URL
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

if (!API_KEY || !API_URL) {
  console.error('Missing OpenRouter API credentials. Check your .env.local file.')
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

const OPENROUTER_MAX_RETRIES = 2
const OPENROUTER_BASE_RETRY_DELAY_MS = 1500

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
    if (!API_KEY || !API_URL) {
      throw new Error('OpenRouter API credentials not configured')
    }

    console.log('Calling OpenRouter API...', { model: MODEL, url: API_URL })
    for (let attempt = 0; attempt <= OPENROUTER_MAX_RETRIES; attempt += 1) {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
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
          const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
          const backoffMs = retryAfterMs ?? OPENROUTER_BASE_RETRY_DELAY_MS * (attempt + 1)
          console.warn(`OpenRouter rate limited request. Retrying in ${backoffMs}ms...`)
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

    return cleanedText.slice(0, 12000)
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
  console.log('analyzeResumeJobMatch called with:', {
    resumeTextLength: resumeText.length,
    jobDescriptionLength: jobDescription.length
  })
  
  const analysisPrompt = `You are an expert resume optimizer and recruiter. Analyze the following resume against the job description and provide detailed analysis in JSON format.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

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
  const prompt = `Based on this resume and job description, provide 3 additional specific recommendations to improve the match:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

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
${jobDescription}

RESUME:
${resumeText}`

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
${jobDescription}

LATEX TEMPLATE TO FOLLOW:
${atsResumeTemplate}

SOURCE RESUME:
${resumeText}`

  try {
    const response = await callOpenRouterAPI([{ role: 'user', content: prompt }], false)

    const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/)
    const warningsMatch = response.match(/<warnings>([\s\S]*?)<\/warnings>/)
    const latexMatch = response.match(/<latex>\s*([\s\S]*?)\s*<\/latex>/)

    const latex = latexMatch?.[1]?.trim() ?? ''
    const summaryRaw = summaryMatch?.[1]?.trim() ?? ''
    const warningsRaw = warningsMatch?.[1]?.trim() ?? '[]'

    if (!latex || !latex.includes('\\documentclass')) {
      throw new Error('No valid LaTeX document found in response')
    }

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

export function buildLatexPdfUrl(latex: string, filename = 'adapted-harvard-resume.pdf'): string {
  const params = new URLSearchParams({
    text: latex,
    command: 'xelatex',
    force: 'true',
    download: filename,
  })

  return `${LATEX_ONLINE_BASE_URL}?${params.toString()}`
}
