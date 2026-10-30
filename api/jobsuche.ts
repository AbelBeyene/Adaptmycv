// Vercel function: proxies the Bundesagentur für Arbeit job search (bundesAPI "jobsuche").
// The API needs an X-API-Key header and sends no CORS headers, so browsers can't call it directly.
// The key is the public one documented by bundesAPI, not a secret.
// Local dev uses the equivalent proxy in vite.config.ts.

const UPSTREAM = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs'
const ALLOWED_PARAMS = ['was', 'wo', 'umkreis', 'page', 'size', 'veroeffentlichtseit', 'angebotsart', 'arbeitszeit']

export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url).searchParams
  const params = new URLSearchParams()
  for (const key of ALLOWED_PARAMS) {
    const value = incoming.get(key)
    if (value) params.set(key, value.slice(0, 120))
  }

  try {
    const upstream = await fetch(`${UPSTREAM}?${params.toString()}`, {
      headers: { 'X-API-Key': 'jobboerse-jobsuche', Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        // Postings change slowly; let Vercel's CDN absorb repeat searches
        'Cache-Control': upstream.ok ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store',
      },
    })
  } catch {
    return Response.json({ error: 'Job search service unavailable' }, { status: 502 })
  }
}
