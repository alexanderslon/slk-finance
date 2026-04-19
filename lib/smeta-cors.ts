import type { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ORIGINS = [
  'https://construction-xi-kohl.vercel.app',
  'https://slk-finance.vercel.app',
]

function parseOrigins(): string[] {
  const raw = process.env.SMETA_CORS_ORIGINS?.trim()
  if (!raw) return DEFAULT_ORIGINS
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Origin из запроса, если он разрешён для CORS смет. */
export function smetaAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const allowed = parseOrigins()
  return allowed.includes(origin) ? origin : null
}

export function applySmetaCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = smetaAllowedOrigin(request)
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Vary', 'Origin')
  }
  return response
}
