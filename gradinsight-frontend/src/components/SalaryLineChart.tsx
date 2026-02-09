import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

type SalarySeries = {
  label: string;
  mean: Array<number | null>;
  median: Array<number | null>;
  data_source: string[];
};

type SalaryMetric = "mean" | "median";

type Props = {
  years: number[];
  series: SalarySeries[];
  metric: SalaryMetric;
};

export function SalaryLineChart({ years, series, metric }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // clear old chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const metricLabel = metric === "mean" ? "Mean" : "Median";

    const datasets = series.map((s) => ({
      label: `${s.label} (${metricLabel})`,
      data: metric === "mean" ? s.mean : s.median,
      borderWidth: 2,
      spanGaps: false,
      segment: {
        borderDash: (ctx: any) =>
          s.data_source?.[ctx.p1DataIndex] === "predicted" ? [6, 6] : undefined,
      },
    }));

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: { labels: years, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              footer: (items) => {
                const item = items?.[0];
                if (!item) return "";

                const index = item.dataIndex;

                const dsLabel = item.dataset.label || "";
                const baseLabel = dsLabel.replace(/\s*\((Mean|Median)\)\s*$/, "");

                const s = series.find((x) => x.label === baseLabel);
                const isPredicted = s?.data_source?.[index] === "predicted";

                return isPredicted ? "(AI Predicted Values)" : "(Official Data)";
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: "Monthly Salary (SGD)" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [years, series, metric]);

  return <canvas ref={canvasRef} />;
}