"use client";

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface MetasChartProps {
  dadosStatus: number[]; // [emAndamento, concluidas]
  progressoMedio: number;
}

export const MetasChart: React.FC<MetasChartProps> = ({ dadosStatus, progressoMedio }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const centerTextPlugin = {
      id: "centerTextPlugin",
      beforeDraw(chart: any) {
        const { ctx } = chart;
        const metaValue = `${progressoMedio}%`;

        ctx.save();

        const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
        const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;

        ctx.font = "700 38px Cormorant Garamond";
        ctx.fillStyle = "#e2c985";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(metaValue, centerX, centerY - 8);

        ctx.font = "700 11px Manrope";
        ctx.fillStyle = "#a89f91";
        ctx.fillText("EVOLUÇÃO GERAL", centerX, centerY + 26);

        ctx.restore();
      },
    };

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Em andamento", "Concluídas"],
        datasets: [
          {
            data: dadosStatus,
            backgroundColor: ["rgba(199, 163, 90, .9)", "rgba(226, 201, 133, .42)"],
            borderColor: ["rgba(226, 201, 133, .9)", "rgba(226, 201, 133, .25)"],
            borderWidth: 2,
            hoverOffset: 14,
            spacing: 6,
            borderRadius: 18,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "74%",
        animation: {
          animateRotate: true,
          duration: 1200,
          easing: "easeOutQuart",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(7, 17, 12, .96)",
            titleColor: "#e2c985",
            bodyColor: "#f3ead8",
            borderColor: "rgba(226, 201, 133, .25)",
            borderWidth: 1,
            padding: 14,
            borderRadius: 14,
            displayColors: false,
          },
        },
      },
      plugins: [centerTextPlugin],
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [dadosStatus, progressoMedio]);

  return (
    <div className="chart-premium-wrapper" style={{ height: "200px", position: "relative" }}>
      <canvas ref={canvasRef} id="graficoMetas"></canvas>
    </div>
  );
};

export default MetasChart;
