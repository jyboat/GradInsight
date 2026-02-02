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

  function selectAllVisible() {
    onChange(allVisibleCourses)
  }

  function clearAll() {
    onChange([])
  }

  function selectUniversity(uni: string) {
    const uniCourses = groupedCourses[uni] ?? []
    const merged = Array.from(
      new Set([...selectedCourses, ...uniCourses])
    )
    onChange(merged)
  }

  function clearUniversity(uni: string) {
    const uniCourses = new Set(groupedCourses[uni] ?? [])
    onChange(selectedCourses.filter(c => !uniCourses.has(c)))
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
            onClick={selectAllVisible}
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
      <div className="max-h-80 overflow-y-auto border rounded-md">
        {Object.entries(groupedCourses).map(([uni, courses]) => {
          const allSelected = courses.every(c => selectedCourses.includes(c))
          const anySelected = courses.some(c => selectedCourses.includes(c))

          return (
            <div key={uni} className="border-b last:border-b-0">
              {/* Sticky university header */}
              <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-slate-500">
                  {uni}
                </span>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectUniversity(uni)}
                    disabled={allSelected}
                  >
                    Select all
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearUniversity(uni)}
                    disabled={!anySelected}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Courses */}
              <div className="px-2 py-1 space-y-1">
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
          )
        })}

        {allVisibleCourses.length === 0 && (
          <p className="text-sm text-slate-500 p-2">
            No courses match your search.
          </p>
        )}
      </div>
    </div>
  )
}
