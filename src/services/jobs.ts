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
  employmentType: 'all' | 'FULLTIME' | 'PARTTIME' | 'CONTRACTOR' | 'INTERN'
  keyword: string
  page?: number
  numPages?: number
  jobRequirements?: string // 'under_3_years_experience' | 'more_than_3_years_experience' | 'no_experience' | 'no_degree'
  radius?: number // distance in km
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

function inferLocation(resumeText: string, countryCode: string): string {
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
    'london',
    'manchester',
    'toronto',
    'vancouver',
    'berlin',
    'munich',
    'paris',
    'sydney',
    'melbourne',
    'mumbai',
    'bangalore',
    'remote',
  ]

  const matched = knownLocations.find((loc) => text.includes(loc))
  if (matched) return matched

  // Map country code to country name
  const countryMap: Record<string, string> = {
    us: 'united states',
    gb: 'united kingdom',
    ca: 'canada',
    de: 'germany',
    fr: 'france',
    au: 'australia',
    in: 'india',
  }

  return countryMap[countryCode] || 'united states'
}

// Whole-word match, so "go" doesn't hit "Google" and "java" doesn't hit "JavaScript"
function hasTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`).test(text)
}

export function computeMatchScore(resumeText: string, title: string, description?: string): number {
  const resume = resumeText.toLowerCase()
  const content = `${title} ${description || ''}`.toLowerCase()

  // Tech terms that appear unchanged in English and German job titles
  const keywords = [
    'react', 'angular', 'vue', 'typescript', 'javascript', 'html', 'css', 'node', 'python', 'java', 'kotlin', 'swift',
    'php', 'c#', '.net', 'go', 'aws', 'azure', 'docker', 'kubernetes', 'sql', 'api', 'devops', 'ux', 'ui', 'figma',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full stack', 'web', 'mobile', 'cloud', 'data',
  ]
  const matched = keywords.filter((keyword) => hasTerm(resume, keyword) && hasTerm(content, keyword)).length

  const base = 70
  const bonus = Math.min(25, matched * 5)
  return Math.max(60, Math.min(98, base + bonus))
}

// ─── Germany: Bundesagentur für Arbeit Jobsuche (free, no account) ─────────────
// Called through our own proxy (/api/jobsuche: Vite dev proxy locally, Vercel function in prod)
// because the API needs an X-API-Key header and sends no CORS headers.
const BA_PROXY_URL = '/api/jobsuche'

export interface BAJob {
  referenznummer?: string
  stellenangebotsTitel?: string
  stellenangebotsart?: string
  hauptberuf?: string
  alleBerufe?: string[]
  firma?: string
  stellenlokationen?: Array<{ adresse?: { ort?: string; region?: string } }>
  datumErsteVeroeffentlichung?: string
  homeofficemoeglich?: boolean
  arbeitszeitVollzeit?: boolean
  arbeitszeitTeilzeitVormittag?: boolean
  arbeitszeitTeilzeitNachmittag?: boolean
  arbeitszeitTeilzeitAbend?: boolean
  arbeitszeitTeilzeitFlexibel?: boolean
}

// German titles return 2-8x more postings than the English ones (e.g. Softwareentwickler vs software developer)
const GERMAN_ROLES: Record<string, string> = {
  'frontend developer': 'Frontend-Entwickler',
  'backend developer': 'Backend-Entwickler',
  'full stack developer': 'Fullstack-Entwickler',
  'software engineer': 'Softwareentwickler',
  'software developer': 'Softwareentwickler',
}

// The API only understands German place names ("Munich" returns nothing)
const GERMAN_CITIES: Array<[RegExp, string]> = [
  [/\bberlin\b/i, 'Berlin'],
  [/\bhamburg\b/i, 'Hamburg'],
  [/\b(munich|münchen|muenchen)\b/i, 'München'],
  [/\b(cologne|köln|koeln)\b/i, 'Köln'],
  [/\bfrankfurt\b/i, 'Frankfurt am Main'],
  [/\bstuttgart\b/i, 'Stuttgart'],
  [/\b(düsseldorf|dusseldorf|duesseldorf)\b/i, 'Düsseldorf'],
  [/\bleipzig\b/i, 'Leipzig'],
  [/\bdresden\b/i, 'Dresden'],
  [/\b(hannover|hanover)\b/i, 'Hannover'],
  [/\b(nuremberg|nürnberg|nuernberg)\b/i, 'Nürnberg'],
  [/\bbremen\b/i, 'Bremen'],
  [/\bdortmund\b/i, 'Dortmund'],
  [/\bbonn\b/i, 'Bonn'],
  [/\bmannheim\b/i, 'Mannheim'],
  [/\bkarlsruhe\b/i, 'Karlsruhe'],
]

// The city mentioned first is usually the address in the resume header
export function inferGermanCity(resumeText: string): string | null {
  let best: { index: number; city: string } | null = null
  for (const [pattern, city] of GERMAN_CITIES) {
    const index = resumeText.search(pattern)
    if (index >= 0 && (!best || index < best.index)) best = { index, city }
  }
  return best?.city ?? null
}

const BA_DAYS: Record<JobsFilters['datePosted'], number | null> = { all: null, today: 0, '3days': 3, week: 7, month: 30 }

export function buildBAParams(resumeText: string, filters: JobsFilters): URLSearchParams {
  const role = inferRole(resumeText)
  const city = inferGermanCity(resumeText)
  const params = new URLSearchParams({
    was: filters.keyword.trim() || GERMAN_ROLES[role] || role,
    page: String(filters.page || 1),
    // Remote can't be filtered server-side in v6, so fetch more and filter locally
    size: filters.remoteOnly ? '100' : '25',
    angebotsart: filters.employmentType === 'INTERN' ? '34' : filters.employmentType === 'CONTRACTOR' ? '2' : '1',
  })
  if (city) {
    params.set('wo', city)
    params.set('umkreis', String(filters.radius || 50))
  }
  const days = BA_DAYS[filters.datePosted]
  if (days !== null) params.set('veroeffentlichtseit', String(days))
  if (filters.employmentType === 'FULLTIME') params.set('arbeitszeit', 'vz')
  if (filters.employmentType === 'PARTTIME') params.set('arbeitszeit', 'tz')
  return params
}

function relativeDate(isoDate: string | undefined, now = new Date()): string {
  const posted = isoDate ? new Date(`${isoDate}T00:00:00`) : null
  if (!posted || Number.isNaN(posted.getTime())) return 'Recently'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.max(0, Math.round((today.getTime() - posted.getTime()) / 86_400_000))
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-days, 'day').replace(/^./, (c) => c.toUpperCase())
}

function baEmploymentType(job: BAJob): string {
  if (job.stellenangebotsart === 'PRAKTIKUM_TRAINEE') return 'Internship / Trainee'
  if (job.stellenangebotsart === 'SELBSTAENDIGKEIT') return 'Self-employed'
  const partTime = job.arbeitszeitTeilzeitVormittag || job.arbeitszeitTeilzeitNachmittag || job.arbeitszeitTeilzeitAbend || job.arbeitszeitTeilzeitFlexibel
  if (job.arbeitszeitVollzeit && partTime) return 'Full-time / Part-time'
  if (job.arbeitszeitVollzeit) return 'Full-time'
  if (partTime) return 'Part-time'
  return 'Full-time'
}

export function mapBAJob(job: BAJob, index: number, resumeText: string, now = new Date()): MatchingJob {
  const places = (job.stellenlokationen ?? []).map((l) => l.adresse?.ort).filter((o): o is string => !!o)
  const uniquePlaces = [...new Set(places)]
  const ref = job.referenznummer
  return {
    id: ref || `ba-${index}`,
    title: job.stellenangebotsTitel || 'Untitled role',
    company: job.firma || 'Unknown company',
    location: uniquePlaces.length
      ? `${uniquePlaces[0]}${uniquePlaces.length > 1 ? ` +${uniquePlaces.length - 1}` : ''}, Germany`
      : 'Germany',
    // The BA detail page carries the full description (readable by "Use") and links on to the employer
    applyLink: ref ? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(ref)}` : '#',
    posted: relativeDate(job.datumErsteVeroeffentlichung, now),
    isRemote: Boolean(job.homeofficemoeglich),
    employmentType: baEmploymentType(job),
    // The list API has no description, so the official occupation adds the missing signal
    match: computeMatchScore(resumeText, job.stellenangebotsTitel || '', [job.hauptberuf, ...(job.alleBerufe ?? [])].join(' ')),
  }
}

async function fetchGermanJobs(resumeText: string, filters: JobsFilters, signal?: AbortSignal): Promise<MatchingJob[]> {
  const response = await fetch(`${BA_PROXY_URL}?${buildBAParams(resumeText, filters).toString()}`, {
    signal: signal ?? AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`Bundesagentur job search failed (${response.status}). Please try again shortly.`)
  }

  const payload = (await response.json()) as { ergebnisliste?: BAJob[] }
  return (payload.ergebnisliste ?? [])
    .filter((job) => !filters.remoteOnly || job.homeofficemoeglich)
    .map((job, index) => mapBAJob(job, index, resumeText))
    .sort((a, b) => b.match - a.match)
    .slice(0, 10)
}

export async function fetchMatchingJobs(resumeText: string, filters: JobsFilters, signal?: AbortSignal): Promise<MatchingJob[]> {
  if (filters.country === 'de') return fetchGermanJobs(resumeText, filters, signal)

  if (!RAPID_API_KEY) {
    throw new Error('Missing VITE_RAPIDAPI_KEY. Add it to your .env.local file.')
  }

  const role = inferRole(resumeText)
  const location = inferLocation(resumeText, filters.country)
  const keywordPart = filters.keyword.trim() ? `${filters.keyword.trim()} ` : ''
  const query = `${keywordPart}${role} jobs in ${location}`

  // Build API parameters using proper parameter names
  const params = new URLSearchParams({
    query,
    page: String(filters.page || 1),
    num_pages: String(filters.numPages || 1),
    country: filters.country,
    date_posted: filters.datePosted,
  })

  // Add work_from_home parameter if remote only
  if (filters.remoteOnly) {
    params.append('work_from_home', 'true')
  }

  // Add employment_types if specific type selected
  if (filters.employmentType !== 'all') {
    params.append('employment_types', filters.employmentType)
  }

  // Add job_requirements if specified
  if (filters.jobRequirements) {
    params.append('job_requirements', filters.jobRequirements)
  }

  // Add radius if specified
  if (filters.radius) {
    params.append('radius', String(filters.radius))
  }

  const response = await fetch(`${RAPID_API_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': RAPID_API_HOST,
      'x-rapidapi-key': RAPID_API_KEY,
    },
    signal: signal ?? AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Jobs API failed: ${response.status} ${response.statusText} ${details}`)
  }

  const payload = (await response.json()) as JSearchResponse
  const jobs = payload?.data || []

  // Map and normalize jobs (API already filtered by remote/employment type)
  const normalizedJobs = jobs
    .slice(0, 10)
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

  // Sort by match score (API already handles most filtering)
  return normalizedJobs.sort((a, b) => b.match - a.match)
}
