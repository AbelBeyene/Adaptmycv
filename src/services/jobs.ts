export interface MatchingJob {
  id: string
  title: string
  company: string
  location: string
  applyLink: string
  posted: string
  isRemote: boolean
  employmentType: string
  match: number
}

export interface JobsFilters {
  country: string
  datePosted: 'all' | 'today' | '3days' | 'week' | 'month'
  remoteOnly: boolean
  employmentType: 'all' | 'full-time' | 'part-time' | 'contract' | 'internship'
  keyword: string
}

interface JSearchResponse {
  status: string
  data: Array<{
    job_id?: string
    job_title?: string
    employer_name?: string
    job_location?: string
    job_city?: string
    job_state?: string
    job_country?: string
    job_apply_link?: string
    job_google_link?: string
    job_posted_human_readable?: string
    job_is_remote?: boolean
    job_employment_type_text?: string
    job_description?: string
  }>
}

const RAPID_API_HOST = 'jsearch.p.rapidapi.com'
const RAPID_API_URL = 'https://jsearch.p.rapidapi.com/search'
const RAPID_API_KEY = import.meta.env.VITE_RAPIDAPI_KEY

function inferRole(resumeText: string): string {
  const text = resumeText.toLowerCase()

  if (text.includes('frontend') || text.includes('react') || text.includes('vue') || text.includes('angular')) {
    return 'frontend developer'
  }
  if (text.includes('backend') || text.includes('node') || text.includes('api') || text.includes('microservices')) {
    return 'backend developer'
  }
  if (text.includes('full stack') || text.includes('fullstack')) {
    return 'full stack developer'
  }
  if (text.includes('data scientist') || text.includes('machine learning') || text.includes('ai')) {
    return 'software engineer'
  }

  return 'software developer'
}

function inferLocation(resumeText: string): string {
  const text = resumeText.toLowerCase()
  const knownLocations = [
    'chicago',
    'new york',
    'san francisco',
    'seattle',
    'austin',
    'boston',
    'los angeles',
    'atlanta',
    'remote',
  ]

  const matched = knownLocations.find((loc) => text.includes(loc))
  return matched || 'united states'
}

function computeMatchScore(resumeText: string, title: string, description?: string): number {
  const resume = resumeText.toLowerCase()
  const content = `${title} ${description || ''}`.toLowerCase()

  const keywords = ['react', 'typescript', 'javascript', 'node', 'python', 'java', 'aws', 'sql', 'api', 'frontend', 'backend']
  const matched = keywords.filter((keyword) => resume.includes(keyword) && content.includes(keyword)).length

  const base = 70
  const bonus = Math.min(25, matched * 5)
  return Math.max(60, Math.min(98, base + bonus))
}

export async function fetchMatchingJobs(resumeText: string, filters: JobsFilters): Promise<MatchingJob[]> {
  if (!RAPID_API_KEY) {
    throw new Error('Missing VITE_RAPIDAPI_KEY. Add it to your .env.local file.')
  }

  const role = inferRole(resumeText)
  const location = inferLocation(resumeText)
  const keywordPart = filters.keyword.trim() ? `${filters.keyword.trim()} ` : ''
  const query = `${keywordPart}${role} jobs in ${location}`

  const params = new URLSearchParams({
    query,
    page: '1',
    num_pages: '1',
    country: filters.country,
    date_posted: filters.datePosted,
  })

  const response = await fetch(`${RAPID_API_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': RAPID_API_HOST,
      'x-rapidapi-key': RAPID_API_KEY,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Jobs API failed: ${response.status} ${response.statusText} ${details}`)
  }

  const payload = (await response.json()) as JSearchResponse
  const jobs = payload?.data || []

  const normalizedJobs = jobs
    .slice(0, 8)
    .map((job, index) => ({
      id: job.job_id || `${job.job_title || 'job'}-${index}`,
      title: job.job_title || 'Untitled role',
      company: job.employer_name || 'Unknown company',
      location:
        job.job_location ||
        [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') ||
        'Location not specified',
      applyLink: job.job_apply_link || job.job_google_link || '#',
      posted: job.job_posted_human_readable || 'Recently',
      isRemote: Boolean(job.job_is_remote),
      employmentType: job.job_employment_type_text || 'N/A',
      match: computeMatchScore(resumeText, job.job_title || '', job.job_description),
    }))

  return normalizedJobs
    .filter((job) => {
      if (filters.remoteOnly && !job.isRemote) {
        return false
      }

      if (filters.employmentType !== 'all') {
        const normalizedType = job.employmentType.toLowerCase()
        if (!normalizedType.includes(filters.employmentType.replace('-', ''))) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => b.match - a.match)
}
