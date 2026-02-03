import { useMemo, useState } from "react";
import type { MetadataRow } from "@/utils/api";
import { EmploymentYearRangeSelector } from "@/components/EmploymentYearRangeSelector";
import { SalaryCompareSelector } from "@/components/SalaryCompareSelector";
import { SalaryLineChart } from "@/components/SalaryLineChart";

type YearsRange = { min: number; max: number };

type Props = {
  metadata: MetadataRow[];
  yearsRange: YearsRange | null;
};

type CompareType = "university" | "degree";

export function SalaryComparisonPage({ metadata, yearsRange }: Props) {
  const [compareType, setCompareType] = useState<CompareType>("university");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [years, setYears] = useState({ start: 2013, end: 2023 });

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Build the selectable list from metadata
  const allUniversities = useMemo(() => {
    return Array.from(new Set(metadata.map(m => m.university))).sort();
  }, [metadata]);

  const allDegrees = useMemo(() => {
    return Array.from(new Set(metadata.map(m => m.degree))).sort();
  }, [metadata]);

  const items = compareType === "university" ? allUniversities : allDegrees;

  function resetResults() {
    setResult(null);
    setError(null);
  }

async function runSalary() {
  if (!yearsRange) return;

  setRunning(true);
  setResult(null);
  setError(null);

  try {
    const params = new URLSearchParams();
    params.set("group_by", compareType);
    params.set("start_year", String(years.start));
    params.set("end_year", String(years.end));

    if (compareType === "university") {
      selectedItems.forEach((u) => params.append("universities", u));
    } else {
      selectedItems.forEach((d) => params.append("degrees", d));
    }

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE}/analytics/salary-comparison?${params.toString()}`
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Request failed (${res.status})`);
    }

    const data = await res.json();
    setResult(data);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Failed to run salary analysis");
  } finally {
    setRunning(false);
  }
}

  return (
    <div className="space-y-6">
      <div className="border-b pb-3">
        <h2 className="text-xl font-semibold">Salary Comparison</h2>
        <p className="text-sm text-slate-600">
          Compare salary trends across years for selected universities or degrees.
        </p>
      </div>

      {/* Compare Type */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Step 1: Choose Compare Type</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setCompareType("university"); setSelectedItems([]); resetResults(); }}
            className={`px-3 py-1 rounded ${compareType === "university" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Universities
          </button>
          <button
            onClick={() => { setCompareType("degree"); setSelectedItems([]); resetResults(); }}
            className={`px-3 py-1 rounded ${compareType === "degree" ? "bg-slate-900 text-white" : "bg-white border"}`}
          >
            Degrees
          </button>
        </div>
      </div>

      {/* Items selector (checkbox + search UI) */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Step 2: Select Course(s)</h3>
        <SalaryCompareSelector
          items={items}
          selected={selectedItems}
          onChange={(vals) => { setSelectedItems(vals); resetResults(); }}
        />
      </div>

      {/* Year range */}
        {yearsRange && (
        <div className="space-y-2">
            <h3 className="text-base font-semibold">Step 3: Select Year Range</h3>
            <EmploymentYearRangeSelector
            startYear={years.start}
            endYear={years.end}
            minYear={yearsRange.min}
            maxYear={yearsRange.max}
            onChange={(y) => { setYears(y); resetResults(); }}
            />
        </div>
        )}

      {/* Run */}
        {yearsRange && (
        <div className="space-y-2">
            {selectedItems.length === 0 && (
            <p className="text-sm text-slate-600">
                No items selected, showing Top 5 by {compareType}.
            </p>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
            onClick={runSalary}
            disabled={running}
            className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
            >
            {running ? "Running…" : "Run Salary Comparison"}
            </button>
        </div>
        )}

      {/* Chart */}
      {result?.series && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Salary Trend Over Time</h3>
          <p className="text-sm text-slate-600">
            Salary metric per year across selected items.
          </p>

          <SalaryLineChart years={result.years} series={result.series} />
        </div>
      )}
    </div>
  );
}