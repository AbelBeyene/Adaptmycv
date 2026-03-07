import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import ResumUploader from './components/ResumeUploader'
import JobDescriptionInput from './components/JobDescriptionInput'
import AnalysisResults from './components/AnalysisResults'
import { extractResumeText } from './services/openrouter'
import './App.css'
import type { PrioritizedRecommendation } from './components/AnalysisResults'

type AppStep = 'upload' | 'job' | 'results'

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('upload')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isDark, setIsDark] = useState(true)
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null)
  const [sidebarRecommendations, setSidebarRecommendations] = useState<PrioritizedRecommendation[]>([])

  useEffect(() => {
    if (!resumeFile || !resumeFile.type.includes('pdf')) {
      setResumePreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(resumeFile)
    setResumePreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [resumeFile])

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file)
    // Extract text from resume file
    const text = await extractResumeText(file)
    setResumeText(text)
    setCurrentStep('job')
  }

  const handleJobSubmit = (text: string) => {
    setJobDescription(text)
    setSidebarRecommendations([])
    setCurrentStep('results')
  }

  const handleReset = () => {
    setCurrentStep('upload')
    setResumeFile(null)
    setResumeText('')
    setJobDescription('')
    setResumePreviewUrl(null)
    setSidebarRecommendations([])
  }

  const getRecommendationColorClasses = (severity: PrioritizedRecommendation['severity']) => {
    if (severity === 'critical') {
      return 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200'
    }

    if (severity === 'important') {
      return 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200'
    }

    return 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200'
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-dark-bg dark:to-dark-card text-gray-900 dark:text-dark-text transition-colors duration-200">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-dark-bg/80 border-b border-gray-200 dark:border-dark-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="AdaptMyCV logo"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">AdaptMyCV</h1>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Tailor your resume instantly</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-dark-text-secondary" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-4 lg:gap-5">
          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {/* Step Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {(['upload', 'job', 'results'] as const).map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center flex-1"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        currentStep === step || index < (['upload', 'job', 'results'] as const).indexOf(currentStep)
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-200 dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary'
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 transition-all ${
                          index < (['upload', 'job', 'results'] as const).indexOf(currentStep)
                            ? 'bg-black dark:bg-white'
                            : 'bg-gray-200 dark:bg-dark-border'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">
                <span>Upload Resume</span>
                <span>Job Description</span>
                <span>Analysis</span>
              </div>
            </div>

            {/* Content */}
            <div className="slide-in">
              {currentStep === 'upload' && (
                <ResumUploader onUpload={handleResumeUpload} />
              )}

              {currentStep === 'job' && (
                <JobDescriptionInput
                  onSubmit={handleJobSubmit}
                  onBack={() => setCurrentStep('upload')}
                />
              )}

              {currentStep === 'results' && resumeFile && jobDescription && (
                <AnalysisResults
                  resumeText={resumeText}
                  jobDescription={jobDescription}
                  onReset={handleReset}
                  onRecommendationsUpdate={setSidebarRecommendations}
                />
              )}
            </div>
          </main>

          {/* Right Sidebar - Resume Preview */}
          {resumeFile && (
            <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
              <div className="sticky top-20 space-y-3">
                <div className="card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Resume</h3>
                    <span className="text-xs text-gray-600 dark:text-dark-text-secondary truncate max-w-[60%]">
                      {resumeFile.name}
                    </span>
                  </div>

                  {resumePreviewUrl ? (
                    <div className="rounded border border-gray-200 dark:border-dark-border overflow-hidden bg-white dark:bg-dark-card">
                      <iframe
                        src={resumePreviewUrl}
                        title="Resume preview"
                        className="w-full h-80"
                      />
                    </div>
                  ) : (
                    <div className="rounded border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card/50 p-3">
                      <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                        Preview available for PDF files only.
                      </p>
                    </div>
                  )}
                </div>

                {currentStep === 'results' && sidebarRecommendations.length > 0 && (
                  <div className="card p-3">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                      Recommendations to Improve Match
                    </h3>
                    <div className="space-y-2">
                      {sidebarRecommendations.map((rec, index) => (
                        <div
                          key={`${rec.text}-${index}`}
                          className={`rounded-lg border p-2 ${getRecommendationColorClasses(rec.severity)}`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide mb-1">{rec.severity}</p>
                          <p className="text-sm leading-relaxed">{rec.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-dark-border mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-600 dark:text-dark-text-secondary">
            <p>AdaptMyCV © 2026 - Optimize your resume for every opportunity</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
