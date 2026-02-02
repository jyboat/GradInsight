import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from "chart.js"
import { Line } from "react-chartjs-2"

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
)

type Series = {
  university: string
  degree: string
  years: number[]
  overall_employment_rate: (number | null)[]
}

type Props = {
  series: Series[]
  aggregate?: boolean
}

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
]

export function EmploymentRateLineChart({ series, aggregate }: Props) {
  if (series.length === 0) return null

  console.log("DEBUG: series content", series);

  const processed = aggregate
    ? Object.values(
      series.reduce((acc, s) => {
        if (!acc[s.university]) {
          acc[s.university] = {
            label: s.university,
            years: s.years,
            values: s.overall_employment_rate.map(v => (v === null ? [] : [v])),
            // NEW: Initialize source array
            sources: s.data_source || []
          }
        } else {
          s.overall_employment_rate.forEach((v, i) => {
            if (v !== null) acc[s.university].values[i].push(v)
          })
        }
        return acc
      }, {} as Record<string, any>)
    ).map((u: any) => ({
      label: u.label,
      years: u.years,
      data: u.values.map((arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
      ),
      // NEW: Pass the source array forward
      sources: u.sources
    }))
    : series.map(s => ({
      label: `${s.degree} (${s.university})`,
      years: s.years,
      data: s.overall_employment_rate,
      // NEW: Map individual series sources
      sources: s.data_source
    }))

  const labels = processed[0].years

  const datasets = processed.map((s, idx) => ({
    label: s.label,
    data: s.data,
    borderColor: COLORS[idx % COLORS.length],
    backgroundColor: COLORS[idx % COLORS.length],
    borderWidth: 2,
    pointRadius: 3,
    spanGaps: false,
    // --- DASHED LINE LOGIC ---
    segment: {
      borderDash: (ctx: any) => {
        // If the 'next' point (p1) is predicted, dash the line leading to it
        const isPredicted = s.sources && s.sources[ctx.p1DataIndex] === 'predicted';
        return isPredicted ? [6, 6] : undefined;
      }
    }
  }))

  return (
    <div className="mt-6">
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: (value) => `${value}%` // Add % back to labels
              }
            },
            x: {
              // Ensures the line touches the edges of the chart
              bounds: 'data'
            }
          },
        }}
      />
    </div>
  )
}