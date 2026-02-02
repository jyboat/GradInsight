import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMemo, useState } from "react"

type Props = {
  coursesByUniversity: Record<string, string[]>
  selectedUniversities: string[]
  selectedCourses: string[]
  onChange: (courses: string[]) => void
}

export function Step2Courses({
  coursesByUniversity,
  selectedUniversities,
  selectedCourses,
  onChange,
}: Props) {
  const [query, setQuery] = useState("")

  // Build grouped + filtered structure
  const groupedCourses = useMemo(() => {
    const result: Record<string, string[]> = {}

    selectedUniversities.forEach(uni => {
      const courses = coursesByUniversity[uni] ?? []
      const filtered = courses.filter(c =>
        c.toLowerCase().includes(query.toLowerCase())
      )
      if (filtered.length > 0) {
        result[uni] = filtered
      }
    })

    return result
  }, [coursesByUniversity, selectedUniversities, query])

  const allVisibleCourses = Object.values(groupedCourses).flat()

  function toggle(course: string) {
    onChange(
      selectedCourses.includes(course)
        ? selectedCourses.filter(c => c !== course)
        : [...selectedCourses, course]
    )
  }

  function selectAll() {
    onChange(allVisibleCourses)
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div className="space-y-3">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {selectedCourses.length} / {allVisibleCourses.length} selected
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={
              allVisibleCourses.length === 0 ||
              selectedCourses.length === allVisibleCourses.length
            }
          >
            Select All
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={selectedCourses.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search courses…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {/* Scrollable grouped list */}
      <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-3">
        {Object.entries(groupedCourses).map(([uni, courses]) => (
          <div key={uni}>
            <div className="sticky top-0 z-10 bg-white text-xs font-semibold text-slate-500 py-1">
              {uni}
            </div>

            <div className="space-y-1">
              {courses.map(course => (
                <label
                  key={course}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedCourses.includes(course)}
                    onCheckedChange={() => toggle(course)}
                  />
                  <span className="text-sm">{course}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {allVisibleCourses.length === 0 && (
          <p className="text-sm text-slate-500">
            No courses match your search.
          </p>
        )}
      </div>
    </div>
  )
}
