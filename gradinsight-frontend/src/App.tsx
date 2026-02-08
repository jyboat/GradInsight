import { useEffect, useMemo, useState } from "react"

import { EmploymentUniversitiesSelector } from "@/components/EmploymentUniversitiesSelector"
import { EmploymentCoursesSelector } from "@/components/EmploymentCoursesSelector"
import { EmploymentYearRangeSelector } from "@/components/EmploymentYearRangeSelector"
import { EmploymentRateLineChart } from "@/components/EmploymentRateLineChart"
import { SalaryDispersionBarChart } from "@/components/SalaryDispersionBarChart"
import { SingleYearSelector } from "@/components/SingleYearSelector"
import { SalaryComparisonPage } from "@/pages/SalaryComparisonPage"
import { PredictionToggle } from "@/components/PredictionToggle"

import { fetchMetadataFull, fetchYears, fetchSalaryDispersion, type MetadataRow } from "@/utils/api"

type Section = "employment" | "salary" | "dispersion"

function App() {
  const [section, setSection] = useState<Section>("employment")

  const [metadata, setMetadata] = useState<MetadataRow[]>([])
  const [yearsRange, setYearsRange] = useState<{ min: number; max: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])

  const [years, setYears] = useState({ start: 2013, end: 2023 })

  const [enablePrediction, setEnablePrediction] = useState(false)
  const [running, setRunning] = useState(false)

  const [employmentResult, setEmploymentResult] = useState<any>(null)
  const [dispersionResult, setDispersionResult] = useState<any>(null)

  const [dispersionReady, setDispersionReady] = useState(false)
  const [dispersionMessage, setDispersionMessage] = useState<string | null>(null)

  // ----------------------------
  // Load metadata
  // ----------------------------
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [full, yearsData] = await Promise.all([fetchMetadataFull(), fetchYears()])

        if (cancelled) return

        setMetadata(full)
        setYearsRange({ min: yearsData.min, max: yearsData.max })
        setYears({ start: yearsData.min, end: yearsData.max })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load metadata")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ----------------------------
  // Derived data
  // ----------------------------
  const allUniversities = useMemo(() => {
    return Array.from(new Set(metadata.map((m) => m.university))).sort()
  }, [metadata])

  const coursesByUniversity = useMemo(() => {
    const map: Record<string, string[]> = {}
    metadata.forEach((row) => {
      if (!map[row.university]) map[row.university] = []
      map[row.university].push(row.degree)
    })
    Object.keys(map).forEach((uni) => {
      map[uni] = Array.from(new Set(map[uni])).sort()
    })
    return map
  }, [metadata])

  // ----------------------------
  // Employment rules (binary)
  // ----------------------------
  const courseCount = selectedCourses.length
  const displayMode = courseCount <= 6 ? "individual" : "aggregate"

  // ----------------------------
  // Helpers
  // ----------------------------
  function resetAllResults() {
    setEmploymentResult(null)
    setDispersionResult(null)
  }

  // ----------------------------
  // Run Employment
  // ----------------------------
  async function runEmploymentAnalysis() {
    setRunning(true)
    setEmploymentResult(null)

    const res = await fetch(`${import.meta.env.VITE_API_BASE}/analytics/employment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        universities: selectedUniversities,
        degrees: selectedCourses,
        start_year: years.start,
        end_year: years.end,
        enable_prediction: enablePrediction,
      }),
    })

    const data = await res.json()
    setEmploymentResult(data)
    setRunning(false)
  }

  // ----------------------------
  // Run Salary Dispersion
  // ----------------------------
  async function runSalaryDispersion() {
    if (selectedCourses.length > 7) return

    setRunning(true)
    setDispersionResult(null)

    const data = await fetchSalaryDispersion({
      universities: selectedUniversities,
      degrees: selectedCourses,
      year: years.start, // single-year view (we reuse start year)
    })

    setDispersionResult(data)
    setRunning(false)
  }

  useEffect(() => {
    async function validateDispersion() {
      // Only validate when inputs make sense
      if (
        section !== "dispersion" ||
        selectedCourses.length === 0 ||
        selectedCourses.length > 7 ||
        !yearsRange
      ) {
        setDispersionReady(false)
        setDispersionMessage(null)
        return
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/analytics/salary-dispersion`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              universities: selectedUniversities,
              degrees: selectedCourses,
              year: years.start,
            }),
          }
        )

        if (!res.ok) {
          setDispersionReady(false)
          setDispersionMessage("No salary data available for this selection.")
          return
        }

        const data = await res.json()

        if (!data.series || data.series.length === 0) {
          setDispersionReady(false)
          setDispersionMessage("No salary data available for the selected year.")
          return
        }

        // Valid data exists
        setDispersionReady(true)
        setDispersionMessage(null)
      } catch {
        setDispersionReady(false)
        setDispersionMessage("Unable to validate salary data.")
      }
    }

    validateDispersion()
  }, [
    section,
    selectedUniversities,
    selectedCourses,
    years.start,
    yearsRange,
  ])


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

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSection("employment")
              resetAllResults()
            }}
            className={`px-3 py-1 rounded ${section === "employment" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Employment Rate
          </button>

          <button
            onClick={() => {
              setSection("salary")
              resetAllResults()
            }}
            className={`px-3 py-1 rounded ${section === "salary" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Salary Comparison
          </button>

          <button
            onClick={() => {
              setSection("dispersion")
              resetAllResults()
            }}
            className={`px-3 py-1 rounded ${section === "dispersion" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Salary Dispersion
          </button>
        </div>

        {loading && <p className="text-slate-600">Loading metadata…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            {/* =======================================
                EMPLOYMENT
            ======================================= */}
            {section === "employment" && (
              <>
                <div className="border-b pb-3">
                  <h2 className="text-xl font-semibold">Employment Rate Analysis</h2>
                  <p className="text-sm text-slate-600">
                    Explore overall graduate employment outcomes by university, course, and year.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold">Step 1: Select University(s)</h3>
                  <EmploymentUniversitiesSelector
                    universities={allUniversities}
                    selected={selectedUniversities}
                    onChange={(vals) => {
                      setSelectedUniversities(vals)
                      setSelectedCourses([])
                      resetAllResults()
                    }}
                  />
                </div>

                {selectedUniversities.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold">Step 2: Select Course(s)</h3>
                    <EmploymentCoursesSelector
                      coursesByUniversity={coursesByUniversity}
                      selectedUniversities={selectedUniversities}
                      selectedCourses={selectedCourses}
                      onChange={(courses) => {
                        setSelectedCourses(courses)
                        resetAllResults()
                      }}
                    />
                  </div>
                )}

                {selectedCourses.length > 0 && yearsRange && (
                  <div>
                    <h3 className="text-base font-semibold">Step 3: Select Year Range</h3>
                    <EmploymentYearRangeSelector
                      startYear={years.start}
                      endYear={years.end}
                      minYear={yearsRange.min}
                      maxYear={yearsRange.max}
                      onChange={(y) => {
                        setYears(y)
                        resetAllResults()
                      }}
                    />
                  </div>
                )}

                {selectedCourses.length > 0 && yearsRange && (
                  <PredictionToggle
                    enabled={enablePrediction}
                    onChange={(val: boolean) => {
                      setEnablePrediction(val)
                      resetAllResults()
                    }}
                  />
                )}

                {selectedCourses.length > 0 && (
                  <div className="space-y-2">
                    {displayMode === "aggregate" && (
                      <p className="text-sm text-blue-600">
                        ℹ️ {courseCount} courses selected. Showing university averages for clarity.
                      </p>
                    )}

                    <button
                      onClick={runEmploymentAnalysis}
                      disabled={running}
                      className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
                    >
                      {running ? "Running…" : "Run Employment Analysis"}
                    </button>
                  </div>
                )}

                {employmentResult?.series && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-semibold">Employment Rate Over Time</h3>
                    <EmploymentRateLineChart series={employmentResult.series} aggregate={displayMode === "aggregate"} />
                  </div>
                )}
              </>
            )}

            {/* =======================================
                SALARY COMPARISON
            ======================================= */}
            {section === "salary" && (
              <SalaryComparisonPage metadata={metadata} yearsRange={yearsRange} />
            )}

            {/* =======================================
                SALARY DISPERSION
            ======================================= */}
            {section === "dispersion" && (
              <>
                <div className="border-b pb-3">
                  <h2 className="text-xl font-semibold">Salary Dispersion Analysis</h2>
                  <p className="text-sm text-slate-600">
                    Compare salary variability using 25th percentile, median, and 75th percentile.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-semibold">Step 1: Select University(s)</h3>
                  <EmploymentUniversitiesSelector
                    universities={allUniversities}
                    selected={selectedUniversities}
                    onChange={(vals) => {
                      setSelectedUniversities(vals)
                      setSelectedCourses([])
                      setDispersionResult(null)
                    }}
                  />
                </div>

                {selectedUniversities.length > 0 && (
                  <div>
                    <h3 className="text-base font-semibold">Step 2: Select Degree(s)</h3>
                    <EmploymentCoursesSelector
                      coursesByUniversity={coursesByUniversity}
                      selectedUniversities={selectedUniversities}
                      selectedCourses={selectedCourses}
                      onChange={(courses) => {
                        setSelectedCourses(courses)
                        setDispersionResult(null)
                      }}
                    />
                  </div>
                )}

                {selectedCourses.length > 0 && yearsRange && (
                  <div>
                    <h3 className="text-base font-semibold">
                      Step 3: Select Year
                    </h3>

                    <SingleYearSelector
                      year={years.start}
                      minYear={yearsRange.min}
                      maxYear={yearsRange.max}
                      onChange={(y) => {
                        setYears({ start: y, end: y })
                        setDispersionResult(null)
                      }}
                    />
                  </div>
                )}

                {selectedCourses.length > 7 && (
                  <p className="text-sm text-red-600">
                    You can compare salary dispersion for up to 7 degrees at a time.
                  </p>
                )}
                {dispersionMessage && (
                  <p className="text-sm text-amber-600">
                    ⚠️ {dispersionMessage}
                  </p>
                )}

                {selectedCourses.length > 0 && selectedCourses.length <= 7 && (
                  <button
                    onClick={runSalaryDispersion}
                    disabled={running || !dispersionReady}
                    className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
                  >
                    {running ? "Running…" : "Run Salary Dispersion"}
                  </button>
                )}

                {dispersionResult?.series && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-semibold">Salary Dispersion by Degree and University</h3>
                    <SalaryDispersionBarChart series={dispersionResult.series} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
