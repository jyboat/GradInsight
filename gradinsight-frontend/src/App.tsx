import { EmploymentUniversitiesSelector } from "@/components/EmploymentUniversitiesSelector"
import { EmploymentCoursesSelector } from "@/components/EmploymentCoursesSelector"
import { EmploymentYearRangeSelector } from "@/components/EmploymentYearRangeSelector"
import { EmploymentRateLineChart } from "@/components/EmploymentRateLineChart"
import { useEffect, useMemo, useState } from "react"
import { fetchMetadataFull, fetchYears, type MetadataRow } from "@/utils/api"
import { SalaryComparisonPage } from "./pages/SalaryComparisonPage"
import { PredictionToggle } from "./components/PredictionToggle"

type Section = "employment" | "salary" | "trends";

function App() {
  const [metadata, setMetadata] = useState<MetadataRow[]>([])
  const [yearsRange, setYearsRange] = useState<{ min: number; max: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [running, setRunning] = useState(false)

  const [years, setYears] = useState({ start: 2013, end: 2023 })

  const [enablePrediction, setEnablePrediction] = useState(false)

  const [section, setSection] = useState<Section>("employment")

  // ----------------------------
  // Load metadata
  // ----------------------------
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [full, yearsData] = await Promise.all([
          fetchMetadataFull(),
          fetchYears(),
        ])

        if (cancelled) return

        setMetadata(full)
        setYearsRange({ min: yearsData.min, max: yearsData.max })
        setYears({ start: yearsData.min, end: yearsData.max })
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load metadata")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ----------------------------
  // Derived data
  // ----------------------------
  const allUniversities = useMemo(() => {
    return Array.from(new Set(metadata.map(m => m.university))).sort()
  }, [metadata])

  const coursesByUniversity = useMemo(() => {
    const map: Record<string, string[]> = {}
    metadata.forEach(row => {
      if (!map[row.university]) map[row.university] = []
      map[row.university].push(row.degree)
    })
    Object.keys(map).forEach(uni => {
      map[uni] = Array.from(new Set(map[uni])).sort()
    })
    return map
  }, [metadata])

  // ----------------------------
  // Course count rules
  // ----------------------------
  const courseCount = selectedCourses.length

  const displayMode =
    courseCount <= 6
      ? "individual"
      : "aggregate"

  // ----------------------------
  // Run analytics
  // ----------------------------
  async function runAnalysis() {
    setRunning(true)
    setResult(null)

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE}/analytics/employment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universities: selectedUniversities,
          degrees: selectedCourses,
          start_year: years.start,
          end_year: years.end,
          enable_prediction: enablePrediction
        }),
      }
    )

    const data = await res.json()
    setResult(data)
    setRunning(false)
  }

  function resetResults() {
    setResult(null)
  }


  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="GradInsight logo" className="h-8 w-8" />
          <h1 className="text-3xl font-bold">GradInsight</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSection("employment")}
            className={`px-3 py-1 rounded ${section === "employment" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Employment
          </button>
          <button
            onClick={() => setSection("salary")}
            className={`px-3 py-1 rounded ${section === "salary" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Salary Comparison
          </button>
          <button
            onClick={() => setSection("trends")}
            className={`px-3 py-1 rounded ${section === "trends" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Trends
          </button>
        </div>

        {loading && <p className="text-slate-600">Loading metadata…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
        <>
          {section === "employment" && (
            <>
              <div className="border-b pb-3">
              <h2 className="text-xl font-semibold">
                Employment Rate Analysis
              </h2>
              <p className="text-sm text-slate-600">
                Explore overall graduate employment outcomes by university, course, and year.
              </p>
            </div>
            {/* STEP 1 */}
            <div>
              <h3 className="text-base font-semibold">
                Step 1: Select University(s)
              </h3>
              <EmploymentUniversitiesSelector
                universities={allUniversities}
                selected={selectedUniversities}
                onChange={(vals) => {
                  setSelectedUniversities(vals)
                  setSelectedCourses([])
                  resetResults()
                }}
              />
            </div>

            {/* STEP 2 */}
            {selectedUniversities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold">Step 2: Select Course(s)</h2>
                <EmploymentCoursesSelector
                  coursesByUniversity={coursesByUniversity}
                  selectedUniversities={selectedUniversities}
                  selectedCourses={selectedCourses}
                  onChange={(courses) => {
                    setSelectedCourses(courses)
                    resetResults()
                  }}
                />
              </div>
            )}

                {/* STEP 2 */}
                {selectedUniversities.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold">Step 2: Select Course(s)</h2>
                    <EmploymentCoursesSelector
                      coursesByUniversity={coursesByUniversity}
                      selectedUniversities={selectedUniversities}
                      selectedCourses={selectedCourses}
                      onChange={(courses) => {
                        setSelectedCourses(courses)
                        resetResults()
                      }}
                    />
                  </div>
                )}

                {/* STEP 3 */}
                {selectedCourses.length > 0 && yearsRange && (
                  <div>
                    <h2 className="text-lg font-semibold">Step 3: Select Year Range</h2>
                    <EmploymentYearRangeSelector
                      startYear={years.start}
                      endYear={years.end}
                      minYear={yearsRange.min}
                      maxYear={yearsRange.max}
                      onChange={(y) => {
                        setYears(y)
                        resetResults()
                      }}
                    />
                  </div>
                )}

                {/* STEP 4: Prediction Toggle */}
                {selectedCourses.length > 0 && yearsRange && (
                  <PredictionToggle
                    enabled={enablePrediction}
                    onChange={(val: boolean) => {
                      setEnablePrediction(val)
                      resetResults()
                    }}
                  />
                )}

                {/* Warnings + Run */}
                {selectedCourses.length > 0 && (
                  <div className="space-y-2">
                    {displayMode === "aggregate" && (
                      <p className="text-sm text-blue-600">
                        ℹ️ {courseCount} courses selected.
                        Showing averages per university for clarity.
                      </p>
                    )}

                    <button
                      onClick={runAnalysis}
                      disabled={running}
                      className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
                    >
                      {running ? "Running…" : "Run Analysis"}
                    </button>
                  </div>
                )}

                {/* Chart */}
                {result?.series && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-semibold">
                      Employment Rate Over Time
                    </h3>
                    <p className="text-sm text-slate-600">
                      Overall employment rate (%) of graduates across selected years.
                    </p>

                    <EmploymentRateLineChart
                      series={result.series}
                      aggregate={displayMode === "aggregate"}
                    />
                  </div>
                )}
              </>
            )}
            {section === "salary" && (
              <SalaryComparisonPage
                metadata={metadata}
                yearsRange={yearsRange}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
