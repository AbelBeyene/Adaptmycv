import { useState, useEffect } from 'react'
import { Download, RefreshCw, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

interface AnalysisResultsProps {
  resumeFile: File
  jobDescription: string
  onReset: () => void
}

interface AnalysisData {
  matchScore: number
  hardSkillsMatch: string[]
  softSkillsMatch: string[]
  missingSkills: string[]
  recommendations: string[]
}

export default function AnalysisResults({ resumeFile, jobDescription, onReset }: AnalysisResultsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)

  useEffect(() => {
    // Simulate API call for analysis
    const timer = setTimeout(() => {
      setAnalysis({
        matchScore: 72,
        hardSkillsMatch: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
        softSkillsMatch: ['Problem Solving', 'Team Collaboration'],
        missingSkills: ['Kubernetes', 'AWS API Gateway', 'GraphQL (advanced)'],
        recommendations: [
          'Highlight your Docker experience more prominently',
          'Add AWS projects to your experience section',
          'Consider adding keywords from job description to skills section',
          'Emphasize team leadership if you have any experience',
        ],
      })
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="section-title">Analyzing Your Resume...</h2>
        <div className="card">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return <div>Error loading analysis</div>
  }

  return (
    <div className="space-y-8">
      {/* Match Score */}
      <div>
        <h2 className="section-title mb-6">Resume Analysis</h2>
        <div className="card">
          <div className="flex items-center justify-between flex-col sm:flex-row gap-8">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-2">
                Match Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{analysis.matchScore}%</span>
                <span className="text-gray-600 dark:text-dark-text-secondary">match</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-3">
                Your resume aligns well with the job requirements
              </p>
            </div>
            <div className="w-40 h-40 rounded-full border-8 border-gray-200 dark:border-dark-border flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border-8 border-black dark:border-white"
                style={{
                  clipPath: `conic-gradient(black ${analysis.matchScore}%, transparent ${analysis.matchScore}%)`,
                }}
              />
              <div className="relative w-32 h-32 rounded-full bg-white dark:bg-dark-card flex items-center justify-center">
                <span className="text-3xl font-bold">{analysis.matchScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matched Skills */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold">Matched Skills</h3>
          </div>
          <div className="space-y-2">
            {analysis.hardSkillsMatch.map((skill) => (
              <div key={skill} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" />
                <span>{skill}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
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
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="font-semibold">Missing Skills</h3>
          </div>
          <div className="space-y-2">
            {analysis.missingSkills.map((skill) => (
              <div key={skill} className="flex items-center gap-2 text-sm opacity-75">
                <div className="w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400" />
                <span>{skill}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
            Consider adding experience with these technologies if you have any
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold">Recommendations to Improve Match</h3>
        </div>
        <div className="space-y-3">
          {analysis.recommendations.map((rec, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50"
            >
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <span className="font-semibold">Tip {index + 1}:</span> {rec}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Job Info */}
      <div className="card bg-gray-50 dark:bg-dark-border/50">
        <h3 className="font-semibold mb-3">Job Description</h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-3">
          {jobDescription}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
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
