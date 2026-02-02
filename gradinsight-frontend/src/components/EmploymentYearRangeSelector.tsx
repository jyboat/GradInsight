import { Input } from "@/components/ui/input"

type Props = {
  startYear: number
  endYear: number
  minYear: number
  maxYear: number
  onChange: (years: { start: number; end: number }) => void
}

export function EmploymentYearRangeSelector({
  startYear,
  endYear,
  minYear,
  maxYear,
  onChange,
}: Props) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Start Year</span>
        <Input
          type="number"
          min={minYear}
          max={endYear}
          value={startYear}
          onChange={(e) =>
            onChange({
              start: Number(e.target.value),
              end: endYear,
            })
          }
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">End Year</span>
        <Input
          type="number"
          min={startYear}
          max={maxYear}
          value={endYear}
          onChange={(e) =>
            onChange({
              start: startYear,
              end: Number(e.target.value),
            })
          }
        />
      </label>
    </div>
  )
}
