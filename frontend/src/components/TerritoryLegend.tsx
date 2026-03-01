import React from 'react';
import type { Territory } from '../types/game';

interface TerritoryLegendProps {
  territories: Territory[];
}

export function TerritoryLegend({ territories }: TerritoryLegendProps) {
  const nativeCount = territories.filter(t => t.owner === 'NativePeoples').length;
  const colonizerCount = territories.filter(t => t.owner === 'Colonizers').length;
  const neutralCount = territories.filter(t => t.owner === 'Neutral').length;

  return (
    <div className="ornate-border rounded-sm p-3 bg-parchment/80">
      <h3 className="font-cinzel text-xs font-bold text-sepia mb-2 uppercase tracking-wider">
        Territórios
      </h3>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-native-green" />
            <span className="font-fell text-xs text-sepia">🌿 Nativos</span>
          </div>
          <span className="font-cinzel text-xs font-bold text-native-green">{nativeCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-colonizer-red" />
            <span className="font-fell text-xs text-sepia">⚔️ Colonizadores</span>
          </div>
          <span className="font-cinzel text-xs font-bold text-colonizer-red">{colonizerCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-ochre" />
            <span className="font-fell text-xs text-sepia">◆ Neutro</span>
          </div>
          <span className="font-cinzel text-xs font-bold text-ochre-dark">{neutralCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 pt-2 border-t border-sepia/20">
        <p className="font-fell text-xs text-sepia/60 mb-1">Conquista</p>
        <div className="w-full h-2 bg-sepia/20 rounded-full overflow-hidden">
          <div
            className="h-full capture-bar-colonizer rounded-full transition-all duration-500"
            style={{ width: `${(colonizerCount / territories.length) * 100}%` }}
          />
        </div>
        <p className="font-fell text-xs text-sepia/50 mt-0.5 text-right">
          {colonizerCount}/{territories.length}
        </p>
      </div>
    </div>
  );
}
