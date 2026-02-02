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

        // 1. Fetch data
        const [full, yearsData] = await Promise.all([
          fetchMetadataFull(),
          fetchYears(),
        ])

        if (cancelled) return

        setMetadata(full)

        // 2. Use min/max directly from backend
        setYearsRange({
          min: yearsData.min,
          max: yearsData.max,
        })

        setYears({
          start: yearsData.min,
          end: yearsData.max,
        })


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

  function SelectionSummary({
    label,
    items,
    max = 3,
  }: {
    label: string
    items: string[]
    max?: number
  }) {
    const [expanded, setExpanded] = useState(false)

    if (items.length === 0) {
      return (
        <div>
          <strong>{label}:</strong> None
        </div>
      )
    }

    const visible = expanded ? items : items.slice(0, max)
    const remaining = items.length - max

    return (
      <div className="text-sm">
        <strong>{label}:</strong>{" "}
        {visible.join(", ")}

        {remaining > 0 && !expanded && (
          <>
            {" "}
            <button
              onClick={() => setExpanded(true)}
              className="text-blue-600 underline"
            >
              +{remaining} more
            </button>
          </>
        )}

        {expanded && (
          <>
            {" "}
            <button
              onClick={() => setExpanded(false)}
              className="text-blue-600 underline"
            >
              Show less
            </button>
          </>
        )}
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="GradInsight logo"
            className="h-8 w-8"
          />
          <h1 className="text-3xl font-bold">GradInsight</h1>
        </div>

        {loading && <p className="text-slate-600">Loading universities and courses…</p>}
        {error && <p className="text-red-600">Error: {error}</p>}

        {!loading && !error && (
          <>
            {/* STEP 1 */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Step 1: Select University(s)
                </h2>
              </div>

              <Step1Universities
                universities={allUniversities}
                selected={selectedUniversities}
                onChange={(vals) => {
                  setSelectedUniversities(vals)
                  setSelectedCourses([])
                }}
              />
            </div>

            {/* STEP 2 */}
            {selectedUniversities.length > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Step 2: Select Course(s)
                  </h2>
                  {/* Select All handled inside Step2Courses */}
                </div>

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

            <SelectionSummary
              label="Universities"
              items={selectedUniversities}
            />

            <SelectionSummary
              label="Courses"
              items={selectedCourses}
            />

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
    </div >
  )
}

export default App