import { useState } from 'react'
import { ArrowLeft, Link as LinkIcon, Zap } from 'lucide-react'
import { extractJobDescriptionFromUrl } from '../services/openrouter'

interface JobDescriptionInputProps {
  onSubmit: (text: string) => void | Promise<void>
  onBack: () => void
}

export default function JobDescriptionInput({ onSubmit, onBack }: JobDescriptionInputProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [jobLink, setJobLink] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const handleFetchFromLink = async () => {
    if (!jobLink.trim()) {
      setLinkError('Please enter a job link first')
      return
    }

    setIsLoading(true)
    setLinkError(null)

    try {
      const fetchedDescription = await extractJobDescriptionFromUrl(jobLink)
      setJobDescription(fetchedDescription)
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to fetch job description')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setLinkError(null)

    try {
      let descriptionToSubmit = jobDescription.trim()

      if (jobLink.trim()) {
        descriptionToSubmit = await extractJobDescriptionFromUrl(jobLink)
        setJobDescription(descriptionToSubmit)
      } else if (descriptionToSubmit.length < 50) {
        if (!descriptionToSubmit) {
          alert('Please paste a job description or provide a job link')
          return
        }

        alert('Please provide a more detailed custom job description (at least 50 characters)')
        return
      }

      await onSubmit(descriptionToSubmit)
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to prepare job description')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="section-title">Add Job Description</h2>
          <p className="section-subtitle mt-1">Use a job link first, or enter a custom description</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 dark:border-dark-border p-4 bg-gray-50 dark:bg-dark-card/50 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Link (Primary)</p>
          <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
            Paste a job post URL and we’ll fetch the description from that page.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={jobLink}
              onChange={(e) => setJobLink(e.target.value)}
              placeholder="https://company.com/careers/job-posting"
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={handleFetchFromLink}
              disabled={isLoading || !jobLink.trim()}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              {isLoading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>

          {linkError && (
            <p className="text-xs text-red-600 dark:text-red-400">{linkError}</p>
          )}
        </div>

        <div>
          <label htmlFor="job-desc" className="block text-sm font-medium mb-3">
            Custom Job Description
          </label>
          <textarea
            id="job-desc"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Optional fallback: paste the job posting here. Include title, requirements, responsibilities, and nice-to-have skills..."
            className="input-field min-h-64 resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
              {jobDescription.length} characters
            </p>
            {jobDescription.length < 50 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Minimum 50 characters if no link is used
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary flex-1"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading || (jobDescription.trim().length < 50 && !jobLink.trim())}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isLoading ? 'Analyzing...' : 'Analyze Match'}
          </button>
        </div>
      </form>
    </div>
  )
}
