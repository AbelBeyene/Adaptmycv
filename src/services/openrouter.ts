import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

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

async function callOpenRouterAPI(prompt: string): Promise<string> {
  try {
    if (!API_KEY || !API_URL) {
      throw new Error('OpenRouter API credentials not configured')
    }

    console.log('Calling OpenRouter API...', { model: MODEL, url: API_URL })
    
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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Response Error:', errorText)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content

    if (typeof content === 'string') {
      return content
    }

    if (Array.isArray(content)) {
      return content
        .map((part: { type?: string; text?: string }) =>
          part?.type === 'text' ? part.text || '' : ''
        )
        .join('')
    }

    throw new Error('Invalid response format from OpenRouter')
  } catch (error) {
    console.error('OpenRouter API error:', error)
    if (error instanceof Error) {
      throw new Error(`API call failed: ${error.message}`)
    }
    throw error
  }
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
      } as any)

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
        .map((item: any) => item.str)
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
    const readableProxyUrl = `https://r.jina.ai/http://${normalizedUrl.replace(/^https?:\/\//i, '')}`

    const response = await fetch(readableProxyUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
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
    const response = await callOpenRouterAPI(analysisPrompt)
    console.log('Received analysis response, length:', response.length)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response:', response)
      throw new Error('Invalid response format from API')
    }

    const analysis = JSON.parse(jsonMatch[0])
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

    return analysis
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
    const response = await callOpenRouterAPI(prompt)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Invalid response format')
    }
    return JSON.parse(jsonMatch[0])
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
    const response = await callOpenRouterAPI(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from API')
    }

    const parsed = JSON.parse(jsonMatch[0])
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
