"use client";

import React from "react";

interface LogoAscendProps {
  height?: number | string;
  width?: number | string;
  className?: string;
}

export const LogoAscend: React.FC<LogoAscendProps> = ({
  height = 72,
  width = "auto",
  className = "",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 300"
      style={{ height, width }}
      className={`ascend-animated-logo ${className}`}
    >
      <defs>
        <style>{`
          @keyframes drawLineMain {
            0% {
              stroke-dashoffset: 600;
              opacity: 0.3;
            }
            50%, 100% {
              stroke-dashoffset: 0;
              opacity: 1;
            }
          }
          @keyframes drawLineAccent {
            0%, 20% {
              stroke-dashoffset: 500;
              opacity: 0;
            }
            70%, 100% {
              stroke-dashoffset: 0;
              opacity: 1;
            }
          }
          @keyframes logoGlowPulse {
            0%, 100% {
              filter: drop-shadow(0 0 6px rgba(199,163,90,0.35));
            }
            50% {
              filter: drop-shadow(0 0 22px rgba(226,201,133,0.95));
            }
          }

          .logo-line-main {
            fill: none;
            stroke: #c7a35a;
            stroke-width: 14;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 600;
            stroke-dashoffset: 600;
            animation: drawLineMain 2.5s ease-in-out infinite alternate, logoGlowPulse 3s ease-in-out infinite;
          }

          .logo-accent-line {
            fill: none;
            stroke: #e2c985;
            stroke-width: 9;
            stroke-linecap: round;
            stroke-dasharray: 500;
            stroke-dashoffset: 500;
            animation: drawLineAccent 2.5s ease-in-out infinite alternate;
          }
        `}</style>
      </defs>

      <path className="logo-line-main" d="M180 230 L250 70 L320 230" />
      <path className="logo-accent-line" d="M165 220 C220 175, 280 155, 340 120" />
    </svg>
  );
};

export default LogoAscend;
