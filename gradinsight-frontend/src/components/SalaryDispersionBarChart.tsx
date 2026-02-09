import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Legend,
  Tooltip,
} from "chart.js"
import { Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Legend, Tooltip)

export type SalaryDispersionSeriesItem = {
  label: string
  p25: number | null
  median: number | null
  p75: number | null
}

type Props = {
  series: SalaryDispersionSeriesItem[]
}

function wrapLabel(label: string, maxChars = 40) {
  const words = label.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if ((current + word).length > maxChars) {
      lines.push(current.trim())
      current = word + " "
    } else {
      current += word + " "
    }
  }

  if (current) lines.push(current.trim())
  return lines
}

export function SalaryDispersionBarChart({ series }: Props) {
  if (!series?.length) return null

  const labels = series.map(s => wrapLabel(s.label))
  const chartHeight = labels.length * 140

  return (
    <div className="mt-6 overflow-x-auto">
      <div style={{ height: chartHeight }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "25th Percentile",
                data: series.map(s => s.p25),
                backgroundColor: "#93c5fd",
              },
              {
                label: "Median",
                data: series.map(s => s.median),
                backgroundColor: "#2563eb",
              },
              {
                label: "75th Percentile",
                data: series.map(s => s.p75),
                backgroundColor: "#1e3a8a",
              },
            ],
          }}
          options={{
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const x = ctx.parsed.x
                    return x == null
                      ? `${ctx.dataset.label}: N/A`
                      : `${ctx.dataset.label}: $${Math.round(x).toLocaleString()}`
                  },
                },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Monthly Salary (SGD)",
                },
              },
              y: {
                ticks: {
                  autoSkip: false,
                },
              },
            },
          }}
        />
      </div>
    </div>
  )
}
