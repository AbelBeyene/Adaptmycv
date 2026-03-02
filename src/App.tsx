import { useState } from 'react'
import { Target, Moon, Sun } from 'lucide-react'
import ResumUploader from './components/ResumeUploader'
import JobDescriptionInput from './components/JobDescriptionInput'
import AnalysisResults from './components/AnalysisResults'
import { extractResumeText } from './services/gemini'
import './App.css'

type AppStep = 'upload' | 'job' | 'results'

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('upload')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [isDark, setIsDark] = useState(true)

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file)
    // Extract text from resume file
    const text = await extractResumeText(file)
    setResumeText(text)
    setCurrentStep('job')
  }

  const handleJobSubmit = (text: string) => {
    setJobDescription(text)
    setCurrentStep('results')
  }

  const handleReset = () => {
    setCurrentStep('upload')
    setResumeFile(null)
    setJobDescription('')
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-dark-bg dark:to-dark-card transition-colors duration-200">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-dark-bg/80 border-b border-gray-200 dark:border-dark-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                <Target className="w-6 h-6 text-white dark:text-black" />
              </div>
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Step Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {(['upload', 'job', 'results'] as const).map((step, index) => (
                <div
                  key={step}
                  className="flex items-center flex-1"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
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
            <div className="mt-4 flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary">
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
              />
            )}
          </div>
        </main>

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
