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
}

export function EmploymentChart({ series }: Props) {
  if (series.length === 0) return null

  const labels = series[0].years

  // const datasets = series.map((s, idx) => ({
  const datasets = series.map((s) => ({
    label: `${s.degree} (${s.university})`,
    data: s.overall_employment_rate,
    borderWidth: 2,
    spanGaps: false, // IMPORTANT: show gaps
  }))

  return (
    <Line
      data={{ labels, datasets }}
      options={{
        responsive: true,
        scales: {
          y: { beginAtZero: true, max: 100 },
        },
      }}
    />
  )
}
