import { useState, useEffect } from 'react'
import { Download, RefreshCw, AlertCircle, CheckCircle2, FileText, Copy, Check } from 'lucide-react'
import { analyzeResumeJobMatch, AnalysisData, CoverLetterVariants, generateCoverLetter } from '../services/openrouter'

export interface PrioritizedRecommendation {
  text: string
  severity: 'critical' | 'important' | 'normal'
}

interface AnalysisResultsProps {
  resumeText: string
  jobDescription: string
  onReset: () => void
  onRecommendationsUpdate?: (recommendations: PrioritizedRecommendation[]) => void
}

function classifyRecommendationSeverity(text: string, index: number): PrioritizedRecommendation['severity'] {
  const normalized = text.toLowerCase()
  const criticalKeywords = ['must', 'required', 'critical', 'essential', 'immediately', 'missing']
  const importantKeywords = ['consider', 'improve', 'highlight', 'add', 'strengthen']

  if (criticalKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'critical'
  }

  if (importantKeywords.some((keyword) => normalized.includes(keyword))) {
    return 'important'
  }

  return index === 0 ? 'important' : 'normal'
}

export default function AnalysisResults({ resumeText, jobDescription, onReset, onRecommendationsUpdate }: AnalysisResultsProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coverLetter, setCoverLetter] = useState<CoverLetterVariants | null>(null)
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false)
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null)
  const [copiedVariant, setCopiedVariant] = useState<'d' | 't' | 'n' | 'p' | null>(null)

  const handleCopyCoverLetter = async (variant: 'd' | 't' | 'n' | 'p', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedVariant(variant)
      setTimeout(() => setCopiedVariant(null), 1500)
    } catch (copyError) {
      console.error('Failed to copy cover letter:', copyError)
    }
  }

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        console.log('Starting analysis...')
        console.log('Resume text length:', resumeText.length)
        console.log('Job description length:', jobDescription.length)
        console.log('Resume text preview:', resumeText.substring(0, 200))
        
        setIsAnalyzing(true)
        setError(null)
        setCoverLetter(null)
        setCoverLetterError(null)
        setIsGeneratingCoverLetter(true)
        onRecommendationsUpdate?.([])

        const result = await analyzeResumeJobMatch(resumeText, jobDescription)
        console.log('Analysis complete:', result)
        setAnalysis(result)
        onRecommendationsUpdate?.(
          result.recommendations.map((text, index) => ({
            text,
            severity: classifyRecommendationSeverity(text, index),
          }))
        )

        try {
          const letter = await generateCoverLetter(resumeText, jobDescription)
          setCoverLetter(letter)
        } catch (letterError) {
          console.error('Cover letter generation failed:', letterError)
          setCoverLetterError(
            letterError instanceof Error ? letterError.message : 'Failed to generate cover letter'
          )
        } finally {
          setIsGeneratingCoverLetter(false)
        }
      } catch (err) {
        console.error('Analysis failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to analyze resume')
        setIsGeneratingCoverLetter(false)
        onRecommendationsUpdate?.([])
      } finally {
        setIsAnalyzing(false)
      }
    }

    runAnalysis()
  }, [resumeText, jobDescription])

  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <h2 className="section-title">Analyzing Your Resume...</h2>
        <div className="card space-y-3">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Running ATS match and skill-gap analysis...</p>
          <div className="space-y-3">
            <div className="h-6 w-48 rounded shimmer" />
            <div className="h-20 w-full rounded-lg shimmer" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="h-28 rounded-lg shimmer" />
              <div className="h-28 rounded-lg shimmer" />
            </div>
            <div className="h-24 w-full rounded-lg shimmer" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="section-title">Analysis Error</h2>
        <div className="card border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Failed to analyze resume</h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
        <button onClick={onReset} className="btn-primary">
          Try Again
        </button>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="space-y-6">
        <h2 className="section-title">No Analysis Available</h2>
        <button onClick={onReset} className="btn-primary">
          Start Over
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Match Score */}
      <div>
        <h2 className="section-title mb-4">Resume Analysis</h2>
        <div className="card">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-5">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-2">
                Match Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{analysis.matchScore}%</span>
                <span className="text-gray-600 dark:text-dark-text-secondary">match</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-3">
                Your resume aligns well with the job requirements
              </p>
            </div>
            <div className="w-32 h-32 rounded-full border-[6px] border-gray-200 dark:border-dark-border flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border-[6px] border-black dark:border-white"
                style={{
                  clipPath: `conic-gradient(black ${analysis.matchScore}%, transparent ${analysis.matchScore}%)`,
                }}
              />
              <div className="relative w-24 h-24 rounded-full bg-white dark:bg-dark-card flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{analysis.matchScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched Skills */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Matched Skills</h3>
          </div>
          <div className="space-y-2">
            {analysis.hardSkillsMatch.map((skill) => (
              <div key={skill} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                <span>{skill}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
            <p className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-2">
              Soft Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.softSkillsMatch.map((skill) => (
                <span key={skill} className="badge">{skill}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Missing Skills */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Missing Skills</h3>
          </div>
          <div className="space-y-2">
            {analysis.missingSkills.map((skill) => (
              <div key={skill} className="flex items-center gap-2 text-sm text-gray-700 dark:text-white opacity-75 dark:opacity-100">
                <div className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400" />
                <span>{skill}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
            Consider adding experience with these technologies if you have any
          </p>
        </div>
      </div>

      {/* Job Info */}
      <div className="card bg-gray-50 dark:bg-dark-border/50">
        <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Job Description</h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-3">
          {jobDescription}
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Cover Letter (4 Versions)</h3>
        </div>

        {isGeneratingCoverLetter ? (
          <div className="rounded-lg border border-gray-200 dark:border-dark-border p-4 bg-gray-50 dark:bg-dark-card/50 space-y-3">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Generating 4 tailored cover letter versions...</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="rounded-lg border border-gray-200 dark:border-dark-border p-3 bg-white dark:bg-dark-card space-y-2">
                  <div className="h-4 w-28 rounded shimmer" />
                  <div className="h-3 w-full rounded shimmer" />
                  <div className="h-3 w-11/12 rounded shimmer" />
                  <div className="h-3 w-10/12 rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
        ) : coverLetterError ? (
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4 bg-red-50 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{coverLetterError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-gray-200 dark:border-dark-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">D Style (Direct)</h4>
                <button
                  type="button"
                  onClick={() => handleCopyCoverLetter('d', coverLetter?.dStyle || '')}
                  className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  disabled={!coverLetter?.dStyle}
                >
                  {copiedVariant === 'd' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedVariant === 'd' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white font-sans leading-relaxed max-h-72 overflow-auto">
                {coverLetter?.dStyle || 'No D style cover letter generated yet.'}
              </pre>
            </div>

            <div className="border border-gray-200 dark:border-dark-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">T Style (Traditional)</h4>
                <button
                  type="button"
                  onClick={() => handleCopyCoverLetter('t', coverLetter?.tStyle || '')}
                  className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  disabled={!coverLetter?.tStyle}
                >
                  {copiedVariant === 't' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedVariant === 't' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white font-sans leading-relaxed max-h-72 overflow-auto">
                {coverLetter?.tStyle || 'No T style cover letter generated yet.'}
              </pre>
            </div>

            <div className="border border-gray-200 dark:border-dark-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">N Style (Natural)</h4>
                <button
                  type="button"
                  onClick={() => handleCopyCoverLetter('n', coverLetter?.naturalStyle || '')}
                  className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  disabled={!coverLetter?.naturalStyle}
                >
                  {copiedVariant === 'n' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedVariant === 'n' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white font-sans leading-relaxed max-h-72 overflow-auto">
                {coverLetter?.naturalStyle || 'No natural style cover letter generated yet.'}
              </pre>
            </div>

            <div className="border border-gray-200 dark:border-dark-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">P Style (Personal)</h4>
                <button
                  type="button"
                  onClick={() => handleCopyCoverLetter('p', coverLetter?.personalStyle || '')}
                  className="btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                  disabled={!coverLetter?.personalStyle}
                >
                  {copiedVariant === 'p' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedVariant === 'p' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-white font-sans leading-relaxed max-h-72 overflow-auto">
                {coverLetter?.personalStyle || 'No personal style cover letter generated yet.'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
        <button
          onClick={onReset}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Analyze Another Job
        </button>
      </div>
    </div>
  )
}
