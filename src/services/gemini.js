const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = import.meta.env.VITE_GEMINI_API_URL;
async function callGeminiAPI(prompt) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': API_KEY,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            }),
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.contents[0].parts[0].text;
    }
    catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}
export async function extractResumeText(file) {
    // For now, return the file name as a placeholder
    // TODO: Implement PDF/DOCX parsing using libraries like pdf-parse, mammoth
    return `Resume file: ${file.name}\nFile size: ${(file.size / 1024).toFixed(2)}KB\n\nNote: Full resume text extraction coming soon with PDF and DOCX parsing libraries.`;
}
export async function analyzeResumeJobMatch(resumeText, jobDescription) {
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
- Return ONLY valid JSON, no additional text`;
    try {
        const response = await callGeminiAPI(analysisPrompt);
        // Parse the JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from API');
        }
        const analysis = JSON.parse(jsonMatch[0]);
        // Validate the response structure
        if (typeof analysis.matchScore !== 'number' ||
            !Array.isArray(analysis.hardSkillsMatch) ||
            !Array.isArray(analysis.softSkillsMatch) ||
            !Array.isArray(analysis.missingSkills) ||
            !Array.isArray(analysis.recommendations)) {
            throw new Error('Invalid response structure from API');
        }
        return analysis;
    }
    catch (error) {
        console.error('Analysis error:', error);
        throw error;
    }
}
export async function generateCustomRecommendations(resumeText, jobDescription, currentRecommendations) {
    const prompt = `Based on this resume and job description, provide 3 additional specific recommendations to improve the match:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Current recommendations:
${currentRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Provide exactly 3 NEW actionable recommendations. Return as a JSON array of strings only:
["recommendation 1", "recommendation 2", "recommendation 3"]`;
    try {
        const response = await callGeminiAPI(prompt);
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Invalid response format');
        }
        return JSON.parse(jsonMatch[0]);
    }
    catch (error) {
        console.error('Error generating recommendations:', error);
        return [];
    }
}
