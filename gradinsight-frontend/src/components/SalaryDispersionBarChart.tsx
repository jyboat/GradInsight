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

export function SalaryDispersionBarChart({ series }: Props) {
  if (!series?.length) return null

  const labels = series.map(s => s.label)

  return (
    <div className="mt-6">
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
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const y = ctx.parsed.y
                  if (y === null || y === undefined) return `${ctx.dataset.label}: N/A`
                  return `${ctx.dataset.label}: $${Math.round(y).toLocaleString()}`
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                autoSkip: false,
                maxRotation: 30,
                minRotation: 0,
              },
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: "Monthly Salary (SGD)" },
            },
          },
        }}
      />
    </div>
  )
}
