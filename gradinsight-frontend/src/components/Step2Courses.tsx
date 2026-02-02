import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

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
  // Collect courses based on selected universities
  const availableCourses = Array.from(
    new Set(
      selectedUniversities.flatMap(
        uni => coursesByUniversity[uni] ?? []
      )
    )
  )

  function toggle(course: string) {
    onChange(
      selectedCourses.includes(course)
        ? selectedCourses.filter(c => c !== course)
        : [...selectedCourses, course]
    )
  }

  function selectAll() {
    onChange(availableCourses)
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div className="space-y-3">
      {/* Header actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={
            availableCourses.length === 0 ||
            selectedCourses.length === availableCourses.length
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

      {/* Checkbox list */}
      <div className="space-y-1">
        {availableCourses.map(course => (
          <label
            key={course}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Checkbox
              checked={selectedCourses.includes(course)}
              onCheckedChange={() => toggle(course)}
            />
            <span>{course}</span>
          </label>
        ))}
      </div>

      {availableCourses.length === 0 && (
        <p className="text-sm text-slate-500">
          No courses available for the selected universities.
        </p>
      )}
    </div>
  )
}
