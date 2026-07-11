"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import confetti from "canvas-confetti";

interface LevelUpContextType {
  triggerLevelUp: (oldLevel: number, newLevel: number) => void;
}

const LevelUpContext = createContext<LevelUpContextType | undefined>(undefined);

export const useLevelUp = () => {
  const context = useContext(LevelUpContext);
  if (!context) {
    throw new Error("useLevelUp must be used within a LevelUpProvider");
  }
  return context;
};

export const LevelUpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [oldLevel, setOldLevel] = useState(1);
  const [currentLevelDisplay, setCurrentLevelDisplay] = useState(1);
  const [newLevel, setNewLevel] = useState(1);

  const triggerLevelUp = (oldLvl: number, newLvl: number) => {
    if (newLvl <= oldLvl) return;

    setOldLevel(oldLvl);
    setCurrentLevelDisplay(oldLvl);
    setNewLevel(newLvl);
    setIsOpen(true);

    // Tocar áudio sintetizado sintetizado de Level Up
    if (typeof window !== "undefined" && (window as any).AscendSFX) {
      try {
        (window as any).AscendSFX.playLevelUp();
      } catch (e) {
        console.warn("Erro ao reproduzir áudio de Level Up:", e);
      }
    }

    // Disparar confetes dourados premium
    const end = Date.now() + 1.8 * 1000;
    const colors = ["#c7a35a", "#e2c985", "#f5eddd", "#8f7440"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  // Efeito odometer digital para aumentar o nível progressivamente na tela
  useEffect(() => {
    if (isOpen && currentLevelDisplay < newLevel) {
      const timer = setTimeout(() => {
        setCurrentLevelDisplay((prev) => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentLevelDisplay, newLevel]);

  return (
    <LevelUpContext.Provider value={{ triggerLevelUp }}>
      {children}

      {/* Overlay Visual Premium de Level Up */}
      {isOpen && (
        <div className="levelup-overlay animate-fade-in">
          <div className="levelup-glow"></div>
          <div className="levelup-crest-container">
            {/* Anéis de luz giratórios */}
            <div className="levelup-ring ring-outer"></div>
            <div className="levelup-ring ring-mid"></div>
            <div className="levelup-ring ring-inner"></div>

            {/* Brasão central */}
            <div className="levelup-crest">
              <span className="crest-label">NÍVEL</span>
              <strong className="crest-number animate-scale-up">{currentLevelDisplay}</strong>
            </div>
          </div>

          <div className="levelup-content text-center mt-5">
            <span className="levelup-kicker mb-2">JORNADA DA ASCENSÃO</span>
            <h2 className="levelup-title mb-3 Cormorant">Elo Superado!</h2>
            <p className="levelup-description mx-auto mb-4 text-muted">
              Você acumulou conhecimentos, cumpriu rotinas e elevou sua consistência. Sua mente desperta para um novo grau de evolução.
            </p>

            <button
              onClick={() => {
                setIsOpen(false);
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="btn btn-ascend px-4 py-2 rounded-pill animate-pulse"
              style={{ minWidth: "160px" }}
            >
              Ascender
            </button>
          </div>

          <style jsx global>{`
            .levelup-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              z-index: 9999;
              background: rgba(5, 9, 6, 0.94);
              backdrop-filter: blur(14px);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            .levelup-glow {
              position: absolute;
              width: 600px;
              height: 600px;
              background: radial-gradient(circle, rgba(199, 163, 90, 0.12) 0%, transparent 70%);
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              pointer-events: none;
              animation: pulsateGlow 4s infinite ease-in-out;
            }

            .levelup-crest-container {
              position: relative;
              width: 260px;
              height: 260px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .levelup-ring {
              position: absolute;
              border-radius: 50%;
              border: 1px solid rgba(226, 201, 133, 0.12);
              pointer-events: none;
            }

            .ring-outer {
              width: 250px;
              height: 250px;
              border-style: dashed;
              animation: spinRing 24s linear infinite;
              border-color: rgba(226, 201, 133, 0.22);
            }

            .ring-mid {
              width: 210px;
              height: 210px;
              border: 2px solid rgba(226, 201, 133, 0.15);
              border-top-color: var(--gold-soft);
              border-bottom-color: var(--gold);
              animation: spinRingBack 18s linear infinite;
            }

            .ring-inner {
              width: 170px;
              height: 170px;
              border-style: dotted;
              animation: spinRing 12s linear infinite;
              border-color: rgba(226, 201, 133, 0.35);
            }

            .levelup-crest {
              width: 140px;
              height: 140px;
              background: radial-gradient(circle, #0e1a12 0%, #050906 100%);
              border: 3px solid var(--gold-soft);
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 45px rgba(199, 163, 90, 0.45);
              z-index: 10;
            }

            .crest-label {
              font-size: 0.65rem;
              letter-spacing: 2px;
              color: rgba(255, 255, 255, 0.45);
              font-weight: 700;
              margin-bottom: 2px;
            }

            .crest-number {
              font-size: 2.8rem;
              line-height: 1;
              color: var(--gold-soft);
              font-weight: 800;
              text-shadow: 0 0 10px rgba(226, 201, 133, 0.5);
            }

            .levelup-content {
              z-index: 20;
              max-width: 520px;
              padding: 0 20px;
            }

            .levelup-kicker {
              font-size: 0.72rem;
              letter-spacing: 3px;
              color: var(--gold-soft);
              font-weight: 800;
              display: block;
              text-shadow: 0 0 5px rgba(226, 201, 133, 0.3);
            }

            .levelup-title {
              font-size: 3rem;
              color: var(--cream);
              font-family: 'Cormorant Garamond', serif;
              font-weight: 600;
              letter-spacing: 0.5px;
            }

            .levelup-description {
              font-size: 0.95rem;
              line-height: 1.6;
              color: #b8b0a5 !important;
            }

            @keyframes spinRing {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            @keyframes spinRingBack {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }

            @keyframes pulsateGlow {
              0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
              50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
            }

            .animate-fade-in {
              animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            .animate-scale-up {
              animation: scaleUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes scaleUp {
              from { transform: scale(0.6); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </LevelUpContext.Provider>
  );
};
