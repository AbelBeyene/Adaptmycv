import { useState } from 'react'
import { ArrowLeft, Zap } from 'lucide-react'

interface JobDescriptionInputProps {
  onSubmit: (text: string) => void
  onBack: () => void
}

export default function JobDescriptionInput({ onSubmit, onBack }: JobDescriptionInputProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (jobDescription.trim().length < 50) {
      alert('Please provide a more detailed job description (at least 50 characters)')
      return
    }

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    onSubmit(jobDescription)
    setIsLoading(false)
  }

  const exampleJobs = [
    'Senior React Developer - 5+ years experience with TypeScript',
    'Full Stack Engineer - Node.js and React, AWS deployment experience',
    'Product Manager - B2B SaaS background required',
  ]

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
          <h2 className="section-title">Paste Job Description</h2>
          <p className="section-subtitle mt-1">Provide the job you're applying for</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="job-desc" className="block text-sm font-medium mb-3">
            Job Description
          </label>
          <textarea
            id="job-desc"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job posting here. Include title, requirements, responsibilities, and nice-to-have skills..."
            className="input-field min-h-64 resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
              {jobDescription.length} characters
            </p>
            {jobDescription.length < 50 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Minimum 50 characters required
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Examples:</p>
          {exampleJobs.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setJobDescription(example)}
              className="text-left p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
            >
              <p className="text-sm font-medium">{example}</p>
            </button>
          ))}
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
            disabled={isLoading || jobDescription.length < 50}
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
