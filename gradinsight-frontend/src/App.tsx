import { Step1Universities } from "@/components/Step1Universities"
import { Step2Courses } from "@/components/Step2Courses"
import { Step3YearRange } from "@/components/Step3YearRange"
import { useEffect, useMemo, useState } from "react"
import { fetchMetadataFull, fetchYears, type MetadataRow } from "@/utils/api"
import { EmploymentChart } from "@/components/EmploymentChart"


function App() {
  const [metadata, setMetadata] = useState<MetadataRow[]>([])
  const [yearsRange, setYearsRange] = useState<{ min: number; max: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [running, setRunning] = useState(false)

  const API_BASE = import.meta.env.VITE_API_BASE

  if (!API_BASE) {
    throw new Error("VITE_API_BASE is not defined. Check your .env file.")
  }

  const [years, setYears] = useState({
    start: 2013,
    end: 2023,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [full, years] = await Promise.all([
          fetchMetadataFull(),
          fetchYears(),
        ])

        if (cancelled) return

        setMetadata(full)
        setYearsRange(years)

        // Reset years to dataset range
        setYears({ start: years.min, end: years.max })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Failed to load metadata")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const allUniversities = useMemo(() => {
    const set = new Set(metadata.map(m => m.university))
    return Array.from(set).sort()
  }, [metadata])

  const coursesByUniversity = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const row of metadata) {
      if (!map[row.university]) map[row.university] = []
      map[row.university].push(row.degree)
    }
    // De-dupe + sort each university’s list
    for (const uni of Object.keys(map)) {
      map[uni] = Array.from(new Set(map[uni])).sort()
    }
    return map
  }, [metadata])

  async function runAnalysis() {
    setRunning(true)
    setResult(null)

    const payload = {
      universities: selectedUniversities,
      degrees: selectedCourses,
      start_year: years.start,
      end_year: years.end,
    }

    const res = await fetch(
      `${API_BASE}/analytics/employment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Request failed: ${res.status} ${text}`)
    }

    const data = await res.json()
    setResult(data)
    setRunning(false)
  }


  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">GradInsight</h1>

        {loading && <p className="text-slate-600">Loading universities and courses…</p>}
        {error && <p className="text-red-600">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* STEP 1 */}
            <div>
              <h2 className="text-lg font-semibold">
                Step 1: Select University(s)
              </h2>
              <Step1Universities
                universities={allUniversities}
                selected={selectedUniversities}
                onChange={(vals) => {
                  setSelectedUniversities(vals)
                  setSelectedCourses([]) // reset downstream
                }}
              />
            </div>

            {/* STEP 2 */}
            {selectedUniversities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold">
                  Step 2: Select Course(s)
                </h2>
                <Step2Courses
                  coursesByUniversity={coursesByUniversity}
                  selectedUniversities={selectedUniversities}
                  selectedCourses={selectedCourses}
                  onChange={(courses) => {
                    setSelectedCourses(courses)
                    if (yearsRange) setYears({ start: yearsRange.min, end: yearsRange.max })
                  }}
                />
              </div>
            )}

            {/* DEBUG (temporary, helpful) */}
            <div className="text-sm text-slate-600">
              <div>
                <strong>Universities:</strong>{" "}
                {selectedUniversities.join(", ") || "None"}
              </div>
              <div>
                <strong>Courses:</strong>{" "}
                {selectedCourses.join(", ") || "None"}
              </div>
            </div>

            {/* STEP 3 */}
            {selectedCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold">
                  Step 3: Select Year Range
                </h2>
                {selectedCourses.length > 0 && yearsRange && (
                  <div>
                    <Step3YearRange
                      startYear={years.start}
                      endYear={years.end}
                      minYear={yearsRange.min}
                      maxYear={yearsRange.max}
                      onChange={setYears}
                    />
                  </div>
                )}
              </div>
            )}

            {selectedCourses.length > 0 && (
              <div>
                <button
                  onClick={runAnalysis}
                  disabled={running}
                  className="mt-4 px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
                >
                  {running ? "Running…" : "Run Analysis"}
                </button>
              </div>
            )}

            {result?.series && (
              <div className="mt-6">
                <EmploymentChart series={result.series} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
