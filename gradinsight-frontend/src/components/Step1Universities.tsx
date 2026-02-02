import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

type Props = {
  universities: string[]
  selected: string[]
  onChange: (vals: string[]) => void
}

export function Step1Universities({
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

  return (
    <div className="space-y-3">
      {/* Header row: title + button */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAll}
          disabled={selected.length === universities.length}
        >
          Select All
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
