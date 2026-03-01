import React from 'react';
import type { Territory } from '../types/game';

interface CaptureProgressBarProps {
  territory: Territory;
}

export function CaptureProgressBar({ territory }: CaptureProgressBarProps) {
  const progress = territory.captureProgress;

  if (territory.owner === 'NativePeoples' && progress === 0) return null;
  if (territory.owner === 'Colonizers' && progress === 100) return null;

  const barColor = territory.owner === 'Colonizers' || progress > 50
    ? 'capture-bar-colonizer'
    : 'capture-bar-native';

  return (
    <div className="w-full h-1.5 bg-sepia/20 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
