import { useEffect, useState, useRef } from 'react'
import { Target, Moon, Sun, Briefcase, SlidersHorizontal, X } from 'lucide-react'
import ResumUploader from './components/ResumeUploader'
import JobDescriptionInput from './components/JobDescriptionInput'
import AnalysisResults from './components/AnalysisResults'
import { extractResumeText } from './services/openrouter'
import { fetchMatchingJobs, type MatchingJob, type JobsFilters } from './services/jobs'
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
  const [matchedJobs, setMatchedJobs] = useState<MatchingJob[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [jobsFilters, setJobsFilters] = useState<JobsFilters>({
    country: 'us',
    datePosted: 'week',
    remoteOnly: false,
    employmentType: 'all',
    keyword: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  // Detect user's country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/')
        if (response.ok) {
          const data = await response.json()
          const countryCode = data.country_code?.toLowerCase()
          
          // Only update if it's a supported country
          const supportedCountries = ['us', 'gb', 'ca', 'de', 'fr', 'au', 'in']
          if (countryCode && supportedCountries.includes(countryCode)) {
            setJobsFilters((prev) => ({ ...prev, country: countryCode }))
          }
        }
      } catch (error) {
        // Silently fail and keep default 'us'
        console.log('Could not detect country, using default')
      }
    }

    detectCountry()
  }, [])

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false)
      }
    }

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilters])

  useEffect(() => {
    if (!resumeText.trim()) {
      setMatchedJobs([])
      setJobsError(null)
      setIsLoadingJobs(false)
      return
    }

    const loadMatchingJobs = async () => {
      try {
        setIsLoadingJobs(true)
        setJobsError(null)
        const jobs = await fetchMatchingJobs(resumeText, jobsFilters)
        setMatchedJobs(jobs)
      } catch (error) {
        setJobsError(error instanceof Error ? error.message : 'Failed to load matching jobs')
        setMatchedJobs([])
      } finally {
        setIsLoadingJobs(false)
      }
    }

    loadMatchingJobs()
  }, [resumeText, jobsFilters])

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
    setMatchedJobs([])
    setJobsError(null)
    setIsLoadingJobs(false)
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

          {/* Right Side Columns */}
          {resumeFile && (
            <div className="hidden lg:flex gap-3 flex-shrink-0">
              <aside className="w-64 xl:w-72 h-[calc(100vh-7rem)] overflow-y-auto pr-1">
                <div className="space-y-3">
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

              <aside className="w-64 xl:w-72 h-[calc(100vh-7rem)] overflow-y-auto pr-1">
                <div>
                  <div className="card p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-700 dark:text-dark-text-secondary" />
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Matching Jobs</h3>
                      </div>
                      <div className="relative" ref={filtersRef}>
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-card-hover transition-colors"
                          title="Filter jobs"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-dark-text-secondary" />
                        </button>

                        {showFilters && (
                          <div className="absolute right-0 top-full mt-2 w-56 card p-3 space-y-2.5 shadow-xl border border-gray-200 dark:border-dark-border z-50">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Filters</h4>
                              <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-white transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-dark-text-secondary mb-0.5">
                                Country
                              </label>
                              <select
                                value={jobsFilters.country}
                                onChange={(e) => setJobsFilters((prev) => ({ ...prev, country: e.target.value }))}
                                className="input-field text-xs py-1 w-full"
                              >
                                <option value="us">🇺🇸 United States</option>
                                <option value="gb">🇬🇧 United Kingdom</option>
                                <option value="ca">🇨🇦 Canada</option>
                                <option value="de">🇩🇪 Germany</option>
                                <option value="fr">🇫🇷 France</option>
                                <option value="au">🇦🇺 Australia</option>
                                <option value="in">🇮🇳 India</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-dark-text-secondary mb-0.5">
                                Date Posted
                              </label>
                              <select
                                value={jobsFilters.datePosted}
                                onChange={(e) =>
                                  setJobsFilters((prev) => ({
                                    ...prev,
                                    datePosted: e.target.value as JobsFilters['datePosted'],
                                  }))
                                }
                                className="input-field text-xs py-1 w-full"
                              >
                                <option value="all">All time</option>
                                <option value="month">Past month</option>
                                <option value="week">Past week</option>
                                <option value="3days">Past 3 days</option>
                                <option value="today">Today</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-dark-text-secondary mb-0.5">
                                Employment Type
                              </label>
                              <select
                                value={jobsFilters.employmentType}
                                onChange={(e) =>
                                  setJobsFilters((prev) => ({
                                    ...prev,
                                    employmentType: e.target.value as JobsFilters['employmentType'],
                                  }))
                                }
                                className="input-field text-xs py-1 w-full"
                              >
                                <option value="all">All types</option>
                                <option value="FULLTIME">Full-time</option>
                                <option value="PARTTIME">Part-time</option>
                                <option value="CONTRACTOR">Contract</option>
                                <option value="INTERN">Internship</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 dark:text-dark-text-secondary mb-0.5">
                                Keyword
                              </label>
                              <input
                                value={jobsFilters.keyword}
                                onChange={(e) => setJobsFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                                placeholder="e.g. react"
                                className="input-field text-xs py-1 w-full"
                              />
                            </div>

                            <label className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-dark-text-secondary cursor-pointer">
                              <input
                                type="checkbox"
                                checked={jobsFilters.remoteOnly}
                                onChange={(e) => setJobsFilters((prev) => ({ ...prev, remoteOnly: e.target.checked }))}
                                className="rounded border-gray-300 dark:border-dark-border w-3 h-3"
                              />
                              Remote only
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isLoadingJobs && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Fetching matching jobs...</p>
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="rounded-lg border border-gray-200 dark:border-dark-border p-2 bg-gray-50 dark:bg-dark-card/50 space-y-2">
                              <div className="h-4 w-3/4 rounded shimmer" />
                              <div className="h-3 w-full rounded shimmer" />
                              <div className="h-3 w-2/3 rounded shimmer" />
                            </div>
                          ))}
                        </div>
                      )}

                      {!isLoadingJobs && jobsError && (
                        <p className="text-xs text-red-600 dark:text-red-400">{jobsError}</p>
                      )}

                      {!isLoadingJobs && !jobsError && matchedJobs.length === 0 && (
                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Upload resume to start matching jobs analysis.</p>
                      )}

                      {!isLoadingJobs && !jobsError && matchedJobs.map((job) => (
                        <a
                          key={job.id}
                          href={job.applyLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg border border-gray-200 dark:border-dark-border p-2 bg-gray-50 dark:bg-dark-card/50 hover:bg-white dark:hover:bg-dark-card transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{job.title}</p>
                              <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-0.5">
                                {job.company} • {job.location}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-dark-text-secondary mt-1">
                                {job.employmentType} • {job.posted}{job.isRemote ? ' • Remote' : ''}
                              </p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 whitespace-nowrap">
                              {job.match}%
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
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
