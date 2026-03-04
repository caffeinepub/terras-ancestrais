import { Button } from "@/components/ui/button";
import React from "react";
import type { GameUnit, TalentPath } from "../types/game";
import { TALENT_PATHS } from "../utils/gameInitializer";

interface TalentSelectionModalProps {
  unit: GameUnit;
  onSelectPath: (unitId: string, path: TalentPath) => void;
}

function getClassEmblem(classType: string): string {
  const emblems: Record<string, string> = {
    ForestWarrior: "/assets/generated/emblem-forest-warrior.dim_128x128.png",
    SpiritHunter: "/assets/generated/emblem-spirit-hunter.dim_128x128.png",
    Shaman: "/assets/generated/emblem-shaman.dim_128x128.png",
    Sentinel: "/assets/generated/emblem-sentinel.dim_128x128.png",
    MusketSoldier: "/assets/generated/emblem-musket-soldier.dim_128x128.png",
    Captain: "/assets/generated/emblem-captain.dim_128x128.png",
    Engineer: "/assets/generated/emblem-engineer.dim_128x128.png",
    Missionary: "/assets/generated/emblem-missionary.dim_128x128.png",
  };
  return emblems[classType] || "";
}

function getClassLabel(classType: string): string {
  const labels: Record<string, string> = {
    ForestWarrior: "Guerreiro da Floresta",
    SpiritHunter: "Caçador Espiritual",
    Shaman: "Xamã",
    Sentinel: "Sentinela",
    MusketSoldier: "Soldado de Mosquete",
    Captain: "Capitão",
    Engineer: "Engenheiro",
    Missionary: "Missionário",
  };
  return labels[classType] || classType;
}

export function TalentSelectionModal({
  unit,
  onSelectPath,
}: TalentSelectionModalProps) {
  const paths = TALENT_PATHS[unit.classType];
  if (!paths) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-sepia border-4 border-ochre/60 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src={getClassEmblem(unit.classType)}
            alt={unit.classType}
            className="w-12 h-12 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="text-center">
            <h2 className="font-cinzel text-xl font-bold text-ochre">
              ⬆️ Subiu de Nível!
            </h2>
            <p className="text-parchment/70 text-sm font-fell">
              {getClassLabel(unit.classType)} — Nível {unit.level}
            </p>
            <p className="text-parchment/50 text-xs font-fell mt-0.5">
              Escolha seu caminho de especialização
            </p>
          </div>
        </div>

        <div className="h-px bg-ochre/30 mb-4" />

        {/* Path Options */}
        <div className="grid grid-cols-2 gap-4">
          {(["PathA", "PathB"] as TalentPath[]).map((path) => {
            const pathData = paths[path];
            const bonuses = pathData.statBonuses;
            const bonusEntries = Object.entries(bonuses).filter(
              ([, v]) => v && v !== 0,
            );

            return (
              <div
                key={path}
                className="bg-parchment/10 border border-ochre/30 rounded-lg p-4 flex flex-col gap-3"
              >
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-ochre mb-1">
                    {pathData.name}
                  </h3>
                  <p className="text-parchment/70 text-xs font-fell">
                    {pathData.description}
                  </p>
                </div>

                {/* Stat Bonuses */}
                {bonusEntries.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-cinzel text-parchment/50 uppercase tracking-wider">
                      Bônus
                    </p>
                    {bonusEntries.map(([stat, value]) => (
                      <div
                        key={stat}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-parchment/60 font-fell capitalize">
                          {stat}
                        </span>
                        <span className="text-native-green font-bold">
                          +{value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ability Upgrades */}
                {pathData.abilityUpgrades.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-cinzel text-parchment/50 uppercase tracking-wider">
                      Melhoria
                    </p>
                    {pathData.abilityUpgrades.map((upgrade) => (
                      <p
                        key={upgrade}
                        className="text-xs text-parchment/70 font-fell"
                      >
                        ✨ {upgrade}
                      </p>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => onSelectPath(unit.id, path)}
                  className="mt-auto font-cinzel text-xs bg-ochre hover:bg-ochre/80 text-sepia font-bold"
                >
                  Escolher {path === "PathA" ? "Caminho A" : "Caminho B"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
