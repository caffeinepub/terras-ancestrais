import React from "react";
import type { GameUnit, Territory } from "../types/game";
import type { PlayerSlot } from "../types/game";
import { getDistance } from "../utils/gameInitializer";

interface UnitActionPanelProps {
  unit: GameUnit | null;
  allUnits: GameUnit[];
  territories: Territory[];
  onAttack: (targetId: string) => void;
  onFortify?: () => void;
  onDeselect: () => void;
  isMoving?: boolean;
  onToggleMove?: () => void;
  actionFeedback?: { message: string; type: string } | null;
  onExecuteAbility: (abilityId: string, targetId?: string) => void;
  onBuild?: (buildType: "tower" | "fortress") => void;
  onDestroy?: () => void;
  players?: PlayerSlot[];
}

const CLASS_LABELS: Record<string, string> = {
  ForestWarrior: "Guerreiro da Floresta",
  SpiritHunter: "Caçador Espiritual",
  Shaman: "Xamã",
  Sentinel: "Sentinela",
  MusketSoldier: "Soldado de Mosquete",
  Captain: "Capitão",
  Engineer: "Engenheiro",
  Missionary: "Missionário",
};

const CLASS_ICONS: Record<string, string> = {
  ForestWarrior: "🪶",
  SpiritHunter: "🏹",
  Shaman: "🔮",
  Sentinel: "🛡",
  MusketSoldier: "🔫",
  Captain: "⚔",
  Engineer: "🔨",
  Missionary: "✝",
};

export function UnitActionPanel({
  unit,
  allUnits,
  territories,
  onAttack,
  onFortify: _onFortify,
  onDeselect,
  isMoving: _isMoving,
  onToggleMove: _onToggleMove,
  actionFeedback,
  onExecuteAbility,
  onBuild,
  onDestroy,
  players,
}: UnitActionPanelProps) {
  if (!unit) {
    return (
      <div className="bg-sepia/60 border border-parchment/20 rounded-lg p-3">
        <p className="font-fell italic text-xs text-parchment/50 text-center">
          Selecione uma unidade para ver ações
        </p>
        <div className="mt-2 space-y-1 text-xs text-parchment/60 font-fell">
          <p>🔵 Pontos azuis = destinos de movimento</p>
          <p>🔴 Anel vermelho = inimigos atacáveis</p>
          <p>👆 Clique direto para mover ou atacar</p>
        </div>
      </div>
    );
  }

  const hpPercent = Math.round((unit.health / unit.maxHealth) * 100);
  const hpColor =
    hpPercent > 60
      ? "bg-forest-green"
      : hpPercent > 30
        ? "bg-ochre"
        : "bg-colonizer-red";

  const playerName =
    players?.find((p) => p.id === unit.playerId)?.name ?? unit.classType;
  const teamLabel =
    unit.team === "NativePeoples" ? "Povos Nativos" : "Colonizadores";
  const teamColor =
    unit.team === "NativePeoples" ? "text-native-green" : "text-colonizer-red";

  // Nearby enemies within attack range
  const nearbyEnemies = allUnits.filter(
    (u) =>
      u.team !== unit.team &&
      u.health > 0 &&
      !u.isInvisible &&
      getDistance(unit.position, u.position) <= unit.attackRange,
  );

  // Current territory (approximate via center distance)
  const currentTerritory = territories.find(
    (t) => getDistance(unit.position, t.center) < 120,
  );
  const _canCapture =
    currentTerritory && currentTerritory.owner !== unit.team && !unit.hasActed;

  // Buildable territory
  const canBuild =
    currentTerritory?.isBuildable &&
    !currentTerritory.construction &&
    !unit.hasActed;
  const nearbyEnemyConstruction = territories.find(
    (t) =>
      t.construction &&
      t.construction.owner !== unit.team &&
      getDistance(unit.position, t.center) < unit.attackRange,
  );
  const canDestroy = !!nearbyEnemyConstruction && !unit.hasActed;

  return (
    <div className="bg-sepia/60 border border-parchment/20 rounded-lg p-3 space-y-2">
      {/* Action feedback banner */}
      {actionFeedback && (
        <div
          className={`text-xs px-2 py-1 rounded font-fell text-center animate-pulse ${
            actionFeedback.type === "success"
              ? "bg-forest-green/40 text-parchment"
              : actionFeedback.type === "warning"
                ? "bg-ochre/40 text-sepia"
                : actionFeedback.type === "error"
                  ? "bg-colonizer-red/40 text-parchment"
                  : "bg-parchment/20 text-parchment/80"
          }`}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{CLASS_ICONS[unit.classType] ?? "⚔"}</span>
          <div>
            <p className="font-cinzel font-bold text-xs text-ochre leading-tight">
              {CLASS_LABELS[unit.classType] ?? unit.classType}
            </p>
            <p className="text-xs text-parchment/60 font-fell">{playerName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xs font-semibold ${teamColor}`}>{teamLabel}</p>
          <p className="text-xs text-parchment/50">Nv.{unit.level}</p>
        </div>
      </div>

      {/* HP bar */}
      <div>
        <div className="flex justify-between text-xs mb-0.5 font-fell text-parchment/70">
          <span>HP</span>
          <span>
            {Math.round(unit.health)}/{unit.maxHealth}
          </span>
        </div>
        <div className="w-full bg-sepia/40 rounded-full h-2">
          <div
            className={`${hpColor} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* XP bar */}
      <div>
        <div className="flex justify-between text-xs mb-0.5 font-fell text-parchment/50">
          <span>XP</span>
          <span>{unit.xp}</span>
        </div>
        <div className="w-full bg-sepia/30 rounded-full h-1.5">
          <div
            className="bg-ochre h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, unit.xp % 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="bg-sepia/20 rounded px-1.5 py-0.5 flex justify-between">
          <span className="text-parchment/60">⚔ Atq</span>
          <span className="font-bold text-parchment">{unit.attack}</span>
        </div>
        <div className="bg-sepia/20 rounded px-1.5 py-0.5 flex justify-between">
          <span className="text-parchment/60">🛡 Def</span>
          <span className="font-bold text-parchment">{unit.defense}</span>
        </div>
        <div className="bg-sepia/20 rounded px-1.5 py-0.5 flex justify-between">
          <span className="text-parchment/60">👣 Mov</span>
          <span className="font-bold text-parchment">
            {Math.round(unit.movementRange)}
          </span>
        </div>
        <div className="bg-sepia/20 rounded px-1.5 py-0.5 flex justify-between">
          <span className="text-parchment/60">🎯 Alc</span>
          <span className="font-bold text-parchment">
            {Math.round(unit.attackRange)}
          </span>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-1 flex-wrap text-xs">
        <span
          className={`px-1.5 py-0.5 rounded-full text-white text-xs ${unit.hasMoved ? "bg-sepia/50" : "bg-forest-green/70"}`}
        >
          {unit.hasMoved ? "✓ Moveu" : "👣 Pode Mover"}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-white text-xs ${unit.hasActed ? "bg-sepia/50" : "bg-ochre/70"}`}
        >
          {unit.hasActed ? "✓ Agiu" : "⚔ Pode Agir"}
        </span>
      </div>

      {/* Quick attack list — enemies within range */}
      {nearbyEnemies.length > 0 && !unit.hasActed && (
        <div>
          <p className="text-xs font-cinzel text-colonizer-red mb-1 uppercase tracking-wide">
            ⚔ Atacar inimigo:
          </p>
          <div className="space-y-1">
            {nearbyEnemies.map((enemy) => (
              <button
                type="button"
                key={enemy.id}
                onClick={() => onAttack(enemy.id)}
                className="w-full flex items-center justify-between bg-colonizer-red/10 hover:bg-colonizer-red/25 border border-colonizer-red/30 rounded px-2 py-1 text-xs transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <span>{CLASS_ICONS[enemy.classType] ?? "⚔"}</span>
                  <span className="font-fell text-parchment/80">
                    {CLASS_LABELS[enemy.classType] ?? enemy.classType}
                  </span>
                </span>
                <span className="text-parchment/50 font-fell">
                  {Math.round(enemy.health)}hp |{" "}
                  {Math.round(getDistance(unit.position, enemy.position))}px
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      {unit.abilities.filter((a) => a.type === "active").length > 0 && (
        <div>
          <p className="text-xs font-cinzel text-ochre/80 mb-1 uppercase tracking-wide">
            Habilidades:
          </p>
          <div className="space-y-1">
            {unit.abilities
              .filter((a) => a.type === "active")
              .map((ability) => (
                <button
                  type="button"
                  key={ability.id}
                  onClick={() => onExecuteAbility(ability.id)}
                  disabled={ability.currentCooldown > 0 || unit.hasActed}
                  className={`w-full text-left px-2 py-1 rounded text-xs font-fell transition-colors border ${
                    ability.currentCooldown > 0 || unit.hasActed
                      ? "bg-sepia/20 border-parchment/10 text-parchment/30 cursor-not-allowed"
                      : "bg-ochre/20 border-ochre/30 text-parchment/80 hover:bg-ochre/30 cursor-pointer"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{ability.name}</span>
                    {ability.currentCooldown > 0 && (
                      <span className="text-parchment/40">
                        CD:{ability.currentCooldown}
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Build actions */}
      {canBuild && onBuild && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onBuild("tower")}
            className="flex-1 bg-ochre/20 hover:bg-ochre/30 border border-ochre/30 rounded px-2 py-1 text-xs font-fell text-parchment/80 transition-colors"
          >
            🗼 Torre
          </button>
          <button
            type="button"
            onClick={() => onBuild("fortress")}
            className="flex-1 bg-ochre/20 hover:bg-ochre/30 border border-ochre/30 rounded px-2 py-1 text-xs font-fell text-parchment/80 transition-colors"
          >
            🏰 Fortaleza
          </button>
        </div>
      )}

      {/* Destroy action */}
      {canDestroy && onDestroy && (
        <button
          type="button"
          onClick={onDestroy}
          className="w-full bg-colonizer-red/20 hover:bg-colonizer-red/30 border border-colonizer-red/30 rounded px-2 py-1 text-xs font-fell text-parchment/80 transition-colors"
        >
          💥 Destruir Construção Inimiga
        </button>
      )}

      {/* Deselect */}
      <button
        type="button"
        onClick={onDeselect}
        className="w-full text-parchment/40 hover:text-parchment/70 text-xs font-fell underline transition-colors"
      >
        Desselecionar (ESC)
      </button>
    </div>
  );
}
