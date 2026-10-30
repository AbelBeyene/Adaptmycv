import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildBAParams, buildSEParams, computeMatchScore, fetchMatchingJobs, inferGermanCity, mapBAJob, mapSEJob, type JobsFilters } from '../jobs'

const filters: JobsFilters = { country: 'de', datePosted: 'week', remoteOnly: false, employmentType: 'all', keyword: '' }
const resume = 'Jane Doe · München, Germany\nFrontend developer with React. Previously interned in Berlin.'

describe('Bundesagentur job search', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('picks the first German city mentioned, in German spelling', () => {
    expect(inferGermanCity(resume)).toBe('München')
    expect(inferGermanCity('Lives in Munich')).toBe('München')
    expect(inferGermanCity('Interessen: essen, kochen')).toBeNull()
  })

  it('maps filters to API params with a German job title', () => {
    const p = buildBAParams(resume, filters)
    expect(Object.fromEntries(p)).toEqual({
      was: 'Frontend-Entwickler', page: '1', size: '25', angebotsart: '1',
      wo: 'München', umkreis: '50', veroeffentlichtseit: '7',
    })

    const q = buildBAParams('no city here', { ...filters, keyword: 'react', datePosted: 'all', employmentType: 'PARTTIME', remoteOnly: true })
    expect(Object.fromEntries(q)).toEqual({ was: 'react', page: '1', size: '100', angebotsart: '1', arbeitszeit: 'tz' })
    expect(buildBAParams(resume, { ...filters, employmentType: 'INTERN' }).get('angebotsart')).toBe('34')
  })

  it('normalizes a v6 posting', () => {
    const job = mapBAJob(
      {
        referenznummer: '10001-1003564427-S',
        stellenangebotsTitel: 'React Developer (m/w/d)',
        firma: 'Acme GmbH',
        stellenlokationen: [{ adresse: { ort: 'Berlin' } }, { adresse: { ort: 'Hamburg' } }, { adresse: { ort: 'Berlin' } }],
        datumErsteVeroeffentlichung: '2026-10-28',
        homeofficemoeglich: true,
        arbeitszeitVollzeit: true,
      },
      0,
      resume,
      new Date('2026-10-30T15:00:00'),
    )
    expect(job).toMatchObject({
      id: '10001-1003564427-S',
      company: 'Acme GmbH',
      location: 'Berlin +1, Germany',
      applyLink: 'https://www.arbeitsagentur.de/jobsuche/jobdetail/10001-1003564427-S',
      posted: '2 days ago',
      isRemote: true,
      employmentType: 'Full-time',
    })
    expect(mapBAJob({}, 3, resume).location).toBe('Germany')
  })

  it('scores on whole words shared by resume and posting', () => {
    const cv = 'Frontend developer: React, HTML, CSS, JavaScript'
    expect(computeMatchScore(cv, 'Entwickler HTML / CSS', 'Webentwickler/in')).toBe(80)
    expect(computeMatchScore(cv, 'Java Backend (m/w/d)')).toBe(70) // "javascript" must not count as "java"
    expect(computeMatchScore('Built tools at Google', 'Go Developer')).toBe(70) // "google" must not count as "go"
    expect(computeMatchScore(cv, 'React Frontend Developer')).toBe(80)
  })

  it('routes Germany through the proxy and filters remote locally', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ergebnisliste: [{ referenznummer: 'a', homeofficemoeglich: false }, { referenznummer: 'b', homeofficemoeglich: true }] })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const jobs = await fetchMatchingJobs(resume, { ...filters, remoteOnly: true })
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/jobsuche\?/)
    expect(jobs.map((j) => j.id)).toEqual(['b'])
  })
})

describe('Swedish job search', () => {
  const se: JobsFilters = { country: 'se', datePosted: 'week', remoteOnly: false, employmentType: 'all', keyword: '' }
  const cv = 'Anna Svensson · Göteborg\nFrontend developer: React, TypeScript'
  afterEach(() => vi.unstubAllGlobals())

  it('builds a Swedish query with the resume city and date window', () => {
    expect(Object.fromEntries(buildSEParams(cv, se))).toEqual({
      q: 'frontendutvecklare Göteborg', limit: '25', offset: '0', 'published-after': '10080',
    })
    const p = buildSEParams('no city', { ...se, keyword: 'react', datePosted: 'all', remoteOnly: true, page: 3 })
    expect(Object.fromEntries(p)).toEqual({ q: 'react', limit: '25', offset: '50', remote: 'true' })
  })

  it('normalizes a JobSearch hit and scores on the description', () => {
    const job = mapSEJob(
      {
        id: '31658258', headline: 'Frontend Developer', employer: { name: 'Techrytera AB' },
        workplace_address: { municipality: 'Göteborg' }, webpage_url: 'https://arbetsformedlingen.se/platsbanken/annonser/31658258',
        publication_date: '2026-10-28T09:00:00', working_hours_type: { label: 'Deltid' },
        workplace_model: { label: 'Distansarbete' }, description: { text: 'We use React and TypeScript' },
      },
      0, cv, false, new Date('2026-10-30T12:00:00'),
    )
    expect(job).toMatchObject({
      company: 'Techrytera AB', location: 'Göteborg, Sweden', posted: '2 days ago',
      isRemote: true, employmentType: 'Part-time', match: 85,
    })
  })

  it('calls JobSearch directly and filters working time locally', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      hits: [{ id: 'a', working_hours_type: { label: 'Deltid' } }, { id: 'b', working_hours_type: { label: 'Heltid' } }],
    })))
    vi.stubGlobal('fetch', fetchMock)
    const jobs = await fetchMatchingJobs(cv, { ...se, employmentType: 'FULLTIME' })
    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/jobsearch\.api\.jobtechdev\.se\/search\?/)
    expect(jobs.map((j) => j.id)).toEqual(['b'])
  })
})
