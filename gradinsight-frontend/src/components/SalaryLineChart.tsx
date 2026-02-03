import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

type SalarySeries = {
  label: string;
  mean: Array<number | null>;
  median: Array<number | null>;
};

type Props = {
  years: number[];
  series: SalarySeries[];
};

export function SalaryLineChart({ years, series }: Props) {
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

    const datasets = series.flatMap((s) => [
      {
        label: `${s.label} (Median)`,
        data: s.median,
        borderWidth: 2,
        spanGaps: false,
      },
      {
        label: `${s.label} (Mean)`,
        data: s.mean,
        borderWidth: 2,
        borderDash: [6, 6],
        spanGaps: false,
      },
    ]);

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: { labels: years, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [years, series]);

  return <canvas ref={canvasRef} />;
}
