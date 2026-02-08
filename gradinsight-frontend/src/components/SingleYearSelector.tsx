type Props = {
  year: number
  minYear: number
  maxYear: number
  onChange: (year: number) => void
}

export function SingleYearSelector({
  year,
  minYear,
  maxYear,
  onChange,
}: Props) {
  const years = []
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y)
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium">
        Year
      </label>

      <select
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded px-3 py-1 bg-white"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}