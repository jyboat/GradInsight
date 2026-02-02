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

    const COLORS = [
        "#2563eb", // blue
        "#16a34a", // green
        "#dc2626", // red
        "#7c3aed", // purple
        "#ea580c", // orange
        "#0891b2", // cyan
    ]
    const datasets = series.map((s, idx) => ({
        label: `${s.degree} (${s.university})`,
        data: s.overall_employment_rate,
        borderColor: COLORS[idx % COLORS.length],
        backgroundColor: COLORS[idx % COLORS.length],
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
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
