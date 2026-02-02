import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

type Props = {
  universities: string[]
  selected: string[]
  onChange: (vals: string[]) => void
}

export function EmploymentUniversitiesSelector({
  universities,
  selected,
  onChange,
}: Props) {
  function toggle(u: string) {
    onChange(
      selected.includes(u)
        ? selected.filter(x => x !== u)
        : [...selected, u]
    )
  }

  function selectAll() {
    onChange(universities)
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
          disabled={selected.length === universities.length}
        >
          Select All
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          disabled={selected.length === 0}
        >
          Clear All
        </Button>
      </div>

      {/* Checkbox list */}
      <div className="space-y-1">
        {universities.map(u => (
          <label
            key={u}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(u)}
              onCheckedChange={() => toggle(u)}
            />
            <span>{u}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
