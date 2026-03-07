const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const API_URL = import.meta.env.VITE_OPENROUTER_API_URL
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

export interface AnalysisData {
  matchScore: number
  hardSkillsMatch: string[]
  softSkillsMatch: string[]
  missingSkills: string[]
  recommendations: string[]
}

async function callOpenRouterAPI(prompt: string): Promise<string> {
  try {
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
      throw new Error(`API error: ${response.statusText}`)
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
    throw error
  }
}

export async function extractResumeText(file: File): Promise<string> {
  return `Resume file: ${file.name}\nFile size: ${(file.size / 1024).toFixed(2)}KB\n\nNote: Full resume text extraction coming soon with PDF and DOCX parsing libraries.`
}

export async function analyzeResumeJobMatch(
  resumeText: string,
  jobDescription: string
): Promise<AnalysisData> {
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
    const response = await callOpenRouterAPI(analysisPrompt)

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format from API')
    }

    const analysis = JSON.parse(jsonMatch[0])

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
