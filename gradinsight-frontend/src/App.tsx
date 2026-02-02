import { useState } from "react"
import { Step1Universities } from "@/components/Step1Universities"
import { Step2Courses } from "@/components/Step2Courses"
import { Step3YearRange } from "@/components/Step3YearRange"

function App() {
  const ALL_UNIVERSITIES = [
    "Nanyang Technological University",
    "Singapore Institute of Technology",
  ]

  const COURSES_BY_UNIVERSITY: Record<string, string[]> = {
    "Nanyang Technological University": [
      "Bachelor of Engineering (Hons) (Bioengineering)",
    ],
    "Singapore Institute of Technology": [
      "Bachelor of Arts in Game Design",
      "Bachelor of Arts with Honours in Interior Design",
      "Bachelor of Engineering with Honours in Information & Communications Technology (Information Security)",
    ],
  }

  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])

  const [years, setYears] = useState({
    start: 2013,
    end: 2023,
  })

  const MIN_YEAR = 2013
  const MAX_YEAR = 2023

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">GradInsight</h1>

        {/* STEP 1 */}
        <div>
          <h2 className="text-lg font-semibold">
            Step 1: Select University(s)
          </h2>
          <Step1Universities
            universities={ALL_UNIVERSITIES}
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
              coursesByUniversity={COURSES_BY_UNIVERSITY}
              selectedUniversities={selectedUniversities}
              selectedCourses={selectedCourses}
              onChange={(courses) => {
                setSelectedCourses(courses)
                setYears({ start: MIN_YEAR, end: MAX_YEAR })
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
            <Step3YearRange
              startYear={years.start}
              endYear={years.end}
              minYear={MIN_YEAR}
              maxYear={MAX_YEAR}
              onChange={setYears}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
