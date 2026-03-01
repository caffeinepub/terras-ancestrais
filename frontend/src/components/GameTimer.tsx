import React from 'react';
import { Clock } from 'lucide-react';

interface GameTimerProps {
  timeRemaining: number;
}

export function GameTimer({ timeRemaining }: GameTimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = timeRemaining <= 60;
  const isWarning = timeRemaining <= 180;

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 rounded-sm border-2 font-cinzel font-bold text-lg
      ${isUrgent
        ? 'border-deep-red bg-deep-red/20 text-deep-red animate-pulse-glow'
        : isWarning
          ? 'border-terracotta bg-terracotta/15 text-terracotta'
          : 'border-sepia bg-parchment/80 text-sepia'
      }
    `}>
      <Clock className="w-5 h-5" />
      <span className="tabular-nums tracking-widest">{formatted}</span>
    </div>
  );
}
