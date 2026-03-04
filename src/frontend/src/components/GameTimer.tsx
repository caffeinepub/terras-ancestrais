import React from "react";

interface GameTimerProps {
  timeRemaining: number;
  conquestCountdown: number | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GameTimer({
  timeRemaining,
  conquestCountdown,
}: GameTimerProps) {
  const isWarning = timeRemaining <= 60 && timeRemaining > 30;
  const isCritical = timeRemaining <= 30;

  const conquestIsWarning =
    conquestCountdown !== null &&
    conquestCountdown <= 120 &&
    conquestCountdown > 60;
  const conquestIsCritical =
    conquestCountdown !== null && conquestCountdown <= 60;

  return (
    <div className="flex flex-col gap-1 items-end">
      {/* Match Timer */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-cinzel font-bold text-sm transition-all ${
          isCritical
            ? "bg-red-900/60 border-red-500/60 animate-pulse"
            : isWarning
              ? "bg-orange-900/40 border-orange-500/40"
              : "bg-sepia/60 border-parchment/20"
        }`}
      >
        <span className="text-xs text-black opacity-70">⏱</span>
        <span className="text-black">{formatTime(timeRemaining)}</span>
      </div>

      {/* Conquest Countdown */}
      {conquestCountdown !== null && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-cinzel font-bold text-sm transition-all ${
            conquestIsCritical
              ? "bg-yellow-600/80 border-yellow-400/80 animate-pulse"
              : conquestIsWarning
                ? "bg-yellow-700/60 border-yellow-500/60"
                : "bg-yellow-800/50 border-yellow-600/50"
          }`}
        >
          <span className="text-xs">⚔️</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xs font-fell text-black opacity-80">
              Conquista
            </span>
            <span className="text-black">{formatTime(conquestCountdown)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
