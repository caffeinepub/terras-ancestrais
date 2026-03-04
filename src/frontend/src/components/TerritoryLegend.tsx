import React from "react";
import type { GameState } from "../types/game";
import { STRATEGIC_POINT_IDS } from "../types/game";

interface TerritoryLegendProps {
  gameState: GameState;
}

export function TerritoryLegend({ gameState }: TerritoryLegendProps) {
  const { territories, conquestCountdown } = gameState;

  const nativeCount = territories.filter(
    (t) => t.owner === "NativePeoples",
  ).length;
  const colonizerCount = territories.filter(
    (t) => t.owner === "Colonizers",
  ).length;
  const neutralCount = territories.filter((t) => t.owner === null).length;
  const totalCount = territories.length;

  const strategicPoints = STRATEGIC_POINT_IDS.map((id) => {
    const territory = territories.find((t) => t.id === id);
    return { id, name: territory?.name || id, owner: territory?.owner || null };
  });

  const allColonized = strategicPoints.every((p) => p.owner === "Colonizers");

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="bg-sepia/80 border border-parchment/20 rounded-lg p-3 text-xs font-fell">
      <h3 className="font-cinzel text-xs font-bold text-ochre mb-2">
        🗺️ Territórios
      </h3>

      <div className="flex justify-between mb-2">
        <span className="text-native-green">🛖 {nativeCount}</span>
        <span className="text-parchment/50">{neutralCount} neutros</span>
        <span className="text-colonizer-red">🏴‍☠️ {colonizerCount}</span>
      </div>

      <div className="h-2 bg-parchment/10 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-colonizer-red/70 transition-all duration-500"
          style={{ width: `${(colonizerCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Strategic Points */}
      <div
        className={`border rounded-lg p-2 mb-2 transition-all ${
          allColonized
            ? "border-yellow-500/60 bg-yellow-900/20"
            : "border-parchment/20 bg-parchment/5"
        }`}
      >
        <p
          className={`font-cinzel text-xs font-bold mb-1.5 ${allColonized ? "text-yellow-400" : "text-parchment/70"}`}
        >
          {allColonized ? "⚔️ Pontos Dominados!" : "⭐ Pontos Estratégicos"}
        </p>
        <div className="space-y-1">
          {strategicPoints.map((point) => (
            <div key={point.id} className="flex items-center justify-between">
              <span className="text-parchment/70 truncate mr-1">
                {point.name}
              </span>
              <span className="flex-shrink-0">
                {point.owner === "Colonizers" ? (
                  <span className="text-colonizer-red text-xs">✓</span>
                ) : point.owner === "NativePeoples" ? (
                  <span className="text-native-green text-xs">✓</span>
                ) : (
                  <span className="text-parchment/40 text-xs">○</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conquest Countdown */}
      {conquestCountdown !== null && (
        <div className="bg-yellow-900/30 border border-yellow-600/40 rounded p-2 text-center animate-pulse">
          <p className="text-yellow-400 font-cinzel text-xs font-bold">
            ⚔️ Conquista em: {formatTime(conquestCountdown)}
          </p>
          <p className="text-yellow-300/70 text-xs mt-0.5">
            Todos os pontos dominados!
          </p>
        </div>
      )}
    </div>
  );
}
