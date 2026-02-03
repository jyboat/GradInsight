import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

type SalarySeries = {
  label: string;
  mean: Array<number | null>;
  median: Array<number | null>;
  data_source: string[];
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
        segment: {
          // ctx.p1DataIndex is the index of the point the line is drawing towards
          borderDash: (ctx: any) =>
            s.data_source[ctx.p1DataIndex] === 'predicted' ? [6, 6] : undefined,
        }
      },
      {
        label: `${s.label} (Mean)`,
        data: s.mean,
        borderWidth: 2,
        // borderDash: [6, 6],
        spanGaps: false,
        segment: {
          // ctx.p1DataIndex is the index of the point the line is drawing towards
          borderDash: (ctx: any) =>
            s.data_source[ctx.p1DataIndex] === 'predicted' ? [6, 6] : undefined,
        }
      },
    ]);

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: { labels: years, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              // Add a "Predicted" label to the tooltip itself
              footer: (items) => {
                const index = items[0].dataIndex;
                const isPredicted = series[0].data_source[index] === 'predicted';
                return isPredicted ? '(AI Predicted Values)' : '(Official Data)';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'Monthly Salary (SGD)' }
          }
        }
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
