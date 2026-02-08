export type MetadataRow = {
  university: string
  degree: string
}

function requireApiBase(): string {
  const base = import.meta.env.VITE_API_BASE
  if (!base) {
    throw new Error("VITE_API_BASE is not defined. Check your .env file.")
  }
  return base
}

export async function fetchMetadataFull(): Promise<MetadataRow[]> {
  const base = requireApiBase()
  const res = await fetch(`${base}/metadata/full`)
  if (!res.ok) {
    throw new Error(`Failed to load metadata/full (${res.status})`)
  }
  return res.json()
}

export async function fetchYears(): Promise<{ min: number; max: number }> {
  const base = requireApiBase()
  const res = await fetch(`${base}/metadata/years`)
  if (!res.ok) {
    throw new Error(`Failed to load metadata/years (${res.status})`)
  }
  return res.json()
}

export async function fetchSalaryDispersion(params: {
  universities: string[]
  degrees: string[]
  year: number
}): Promise<{ year: number; series: { label: string; p25: number | null; median: number | null; p75: number | null }[] }> {
  const base = requireApiBase()

  const res = await fetch(`${base}/analytics/salary-dispersion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }

  return data
}
