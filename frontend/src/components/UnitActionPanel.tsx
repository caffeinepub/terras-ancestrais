import React, { useState, useEffect } from 'react';
import type { GameUnit, Territory, TerrainType, ClassType } from '../types/game';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sword, Shield, Move, X } from 'lucide-react';
import { getDistance, getTerritoryAtPosition } from '../utils/gameInitializer';

interface UnitActionPanelProps {
  unit: GameUnit | null;
  allUnits: GameUnit[];
  territories: Territory[];
  onAttack: (targetId: string) => void;
  onFortify: () => void;
  onDeselect: () => void;
  isMoving: boolean;
  onToggleMove: () => void;
  actionFeedback?: string | null;
  onExecuteAbility?: (abilityId: string, targetId?: string) => void;
  onBuild?: (buildType: 'tower' | 'fortress') => void;
  onDestroy?: () => void;
}

function getTerrainLabel(terrain: TerrainType): { icon: string; label: string; bonus: string } {
  switch (terrain) {
    case 'forest':  return { icon: '🌲', label: 'Floresta', bonus: '+15% Dano' };
    case 'plains':  return { icon: '🌾', label: 'Planície', bonus: '+10% Dano Mosquete' };
    case 'hills':   return { icon: '⛰', label: 'Colinas', bonus: '+10% Dano Ranged' };
    case 'river':   return { icon: '🌊', label: 'Rio', bonus: 'Ponto Estratégico' };
    case 'village': return { icon: '🛖', label: 'Aldeia', bonus: 'Ponto Estratégico' };
    case 'fort':    return { icon: '🏰', label: 'Forte', bonus: 'Ponto Estratégico' };
    default:        return { icon: '◆', label: 'Neutro', bonus: '' };
  }
}

function getClassLabel(classType: ClassType): string {
  const labels: Record<ClassType, string> = {
    ForestWarrior: 'Guerreiro da Floresta',
    SpiritHunter: 'Caçador Espiritual',
    Shaman: 'Xamã',
    Sentinel: 'Sentinela',
    MusketSoldier: 'Soldado de Mosquete',
    Captain: 'Capitão',
    Engineer: 'Engenheiro',
    Missionary: 'Missionário',
  };
  return labels[classType] || classType;
}

function getClassEmblem(classType: ClassType): string {
  const emblems: Record<ClassType, string> = {
    ForestWarrior: '/assets/generated/emblem-forest-warrior.dim_128x128.png',
    SpiritHunter: '/assets/generated/emblem-spirit-hunter.dim_128x128.png',
    Shaman: '/assets/generated/emblem-shaman.dim_128x128.png',
    Sentinel: '/assets/generated/emblem-sentinel.dim_128x128.png',
    MusketSoldier: '/assets/generated/emblem-musket-soldier.dim_128x128.png',
    Captain: '/assets/generated/emblem-captain.dim_128x128.png',
    Engineer: '/assets/generated/emblem-engineer.dim_128x128.png',
    Missionary: '/assets/generated/emblem-missionary.dim_128x128.png',
  };
  return emblems[classType] || '';
}

export function UnitActionPanel({
  unit,
  allUnits,
  territories,
  onAttack,
  onFortify,
  onDeselect,
  isMoving,
  onToggleMove,
  actionFeedback,
  onExecuteAbility,
  onBuild,
  onDestroy,
}: UnitActionPanelProps) {
  const [flashFeedback, setFlashFeedback] = useState(false);

  useEffect(() => {
    if (actionFeedback) {
      setFlashFeedback(true);
      const t = setTimeout(() => setFlashFeedback(false), 600);
      return () => clearTimeout(t);
    }
  }, [actionFeedback]);

  if (!unit) {
    return (
      <div className="ornate-border rounded-sm p-4 bg-parchment/80 text-center">
        <p className="font-fell italic text-sepia/50 text-sm">Clique em uma unidade para selecioná-la</p>
        <p className="font-fell text-xs text-sepia/30 mt-1">Suas unidades têm um anel brilhante</p>
      </div>
    );
  }

  const enemies = allUnits.filter(
    u => u.team !== unit.team && u.health > 0 && !u.isInvisible &&
    getDistance(unit.position, u.position) <= unit.attackRange
  );

  const isNative = unit.team === 'NativePeoples';
  const teamColor = isNative ? 'text-native-green' : 'text-colonizer-red';
  const teamBg = isNative ? 'bg-native-green/10' : 'bg-colonizer-red/10';

  const currentTerritory = getTerritoryAtPosition(territories, unit.position);
  const terrainInfo = currentTerritory ? getTerrainLabel(currentTerritory.terrain) : null;

  const hasFortifyShield = unit.fortifyTurnsRemaining > 0;
  const hasMoraleDebuff = unit.moraleTurnsRemaining > 0;
  const canFortify = !unit.hasActed && unit.health > 0 && !hasFortifyShield;
  const canMove = !unit.hasMoved && unit.health > 0;
  const canAttack = !unit.hasActed && unit.health > 0 && enemies.length > 0;

  const activeAbilities = unit.abilities.filter(a => a.type === 'active');
  const passiveAbilities = unit.abilities.filter(a => a.type === 'passive');

  const canBuild = unit.classType === 'Engineer' && !unit.hasActed && currentTerritory?.isBuildable && !currentTerritory.construction;
  const canDestroy = unit.classType === 'Sentinel' && !unit.hasActed && territories.some(t =>
    t.construction && t.construction.owner !== unit.team &&
    getDistance(unit.position, t.center) < unit.attackRange
  );

  return (
    <TooltipProvider>
      <div className={`ornate-border rounded-sm p-3 ${teamBg} min-w-[200px]`}>
        {/* Action feedback banner */}
        {actionFeedback && (
          <div className={`text-center text-xs font-bold py-1 px-2 rounded mb-2 transition-all duration-300 ${
            flashFeedback ? 'bg-ochre/80 text-sepia scale-105' : 'bg-ochre/40 text-sepia/80'
          }`}>
            {actionFeedback}
          </div>
        )}

        {/* Header with class emblem */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img
              src={getClassEmblem(unit.classType)}
              alt={unit.classType}
              className="w-8 h-8 object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p className={`font-cinzel text-xs font-bold ${teamColor}`}>
                {getClassLabel(unit.classType)}
              </p>
              <p className="font-fell text-xs text-sepia/60">
                Nível {unit.level} • {unit.xp} XP
                {unit.talentPath && <span className="ml-1 text-ochre">({unit.talentPath})</span>}
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onDeselect} className="text-sepia/50 hover:text-sepia transition-colors">
                <X className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">Desselecionar (Escape)</TooltipContent>
          </Tooltip>
        </div>

        {/* Health bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs font-fell text-sepia/70 mb-0.5">
            <span>Vida</span>
            <span>{Math.round(unit.health)}/{unit.maxHealth}</span>
          </div>
          <div className="w-full h-2 bg-sepia/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isNative ? 'bg-native-green' : 'bg-colonizer-red'}`}
              style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
            />
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs font-fell text-sepia/50 mb-0.5">
            <span>XP</span>
            <span>{unit.xp}/{unit.level === 1 ? 100 : unit.level === 2 ? 250 : '—'}</span>
          </div>
          <div className="w-full h-1.5 bg-sepia/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-ochre rounded-full transition-all"
              style={{ width: `${Math.min(100, unit.level === 1 ? (unit.xp / 100) * 100 : unit.level === 2 ? ((unit.xp - 100) / 150) * 100 : 100)}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 mb-2 text-center">
          <div className="bg-parchment/60 rounded-sm p-1">
            <p className="text-xs font-cinzel text-sepia/50">ATK</p>
            <p className={`text-sm font-bold ${hasMoraleDebuff ? 'text-yellow-700' : 'text-sepia'}`}>
              {unit.attack}{hasMoraleDebuff ? '↓' : ''}
            </p>
          </div>
          <div className="bg-parchment/60 rounded-sm p-1">
            <p className="text-xs font-cinzel text-sepia/50">DEF</p>
            <p className="text-sm font-bold text-sepia">
              {unit.defense}{hasFortifyShield ? '🛡' : ''}
            </p>
          </div>
          <div className="bg-parchment/60 rounded-sm p-1">
            <p className="text-xs font-cinzel text-sepia/50">MOV</p>
            <p className={`text-sm font-bold ${currentTerritory?.terrain === 'plains' ? 'text-ochre' : 'text-sepia'}`}>
              {unit.movementRange}
            </p>
          </div>
        </div>

        {/* Active buffs/debuffs */}
        {(hasFortifyShield || hasMoraleDebuff || terrainInfo) && (
          <div className="mb-2 space-y-1">
            {hasFortifyShield && (
              <div className="flex items-center gap-1 bg-ochre/20 rounded-sm px-2 py-0.5">
                <span className="text-xs">🛡</span>
                <span className="text-xs font-fell text-sepia/80">Escudo ({unit.fortifyTurnsRemaining} turnos)</span>
              </div>
            )}
            {hasMoraleDebuff && (
              <div className="flex items-center gap-1 bg-sepia/20 rounded-sm px-2 py-0.5">
                <span className="text-xs">💔</span>
                <span className="text-xs font-fell text-sepia/70">Moral Baixa ({unit.moraleTurnsRemaining}t)</span>
              </div>
            )}
            {terrainInfo && (
              <div className="flex items-center gap-1 bg-parchment/60 rounded-sm px-2 py-0.5">
                <span className="text-xs">{terrainInfo.icon}</span>
                <span className="text-xs font-fell text-sepia/70">{terrainInfo.label}: {terrainInfo.bonus}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1.5">
          <p className="text-xs font-cinzel text-sepia/50 uppercase tracking-wider">Ações</p>

          {/* Move button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isMoving ? 'default' : 'outline'}
                onClick={onToggleMove}
                disabled={!canMove}
                className={`w-full h-8 text-xs font-cinzel ${
                  !canMove ? 'opacity-40 cursor-not-allowed'
                    : isMoving ? 'bg-ochre text-sepia border-ochre hover:bg-ochre/80'
                    : 'border-sepia/40 text-sepia hover:bg-sepia/10'
                }`}
              >
                <Move className="w-3 h-3 mr-1" />
                {isMoving ? 'Cancelar Mover' : 'Mover'}
                {unit.hasMoved && <span className="ml-1 text-green-600">✓</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[180px]">
              {canMove ? 'Clique no mapa para mover.' : 'Já se moveu neste turno'}
            </TooltipContent>
          </Tooltip>

          {/* Attack buttons */}
          {enemies.length > 0 ? (
            enemies.slice(0, 2).map(enemy => (
              <Tooltip key={enemy.id}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAttack(enemy.id)}
                    disabled={!canAttack}
                    className={`w-full h-8 text-xs font-cinzel border-colonizer-red/60 text-colonizer-red hover:bg-colonizer-red/10 ${!canAttack ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Sword className="w-3 h-3 mr-1" />
                    Atacar
                    <span className="ml-1 text-sepia/50">{Math.round(enemy.health)}hp</span>
                    {unit.hasActed && <span className="ml-1 text-green-600">✓</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[180px]">
                  {canAttack ? `Atacar (${Math.round(enemy.health)}/${enemy.maxHealth} HP)` : 'Já agiu neste turno'}
                </TooltipContent>
              </Tooltip>
            ))
          ) : (
            <Button size="sm" variant="outline" disabled className="w-full h-8 text-xs font-cinzel opacity-40 border-sepia/30 text-sepia/50">
              <Sword className="w-3 h-3 mr-1" />
              Sem alvos
            </Button>
          )}

          {/* Fortify button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onFortify}
                disabled={!canFortify}
                className={`w-full h-8 text-xs font-cinzel border-ochre/60 text-ochre hover:bg-ochre/10 ${!canFortify ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Shield className="w-3 h-3 mr-1" />
                Fortalecer
                {hasFortifyShield && <span className="ml-1 text-green-600">✓</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[180px]">
              {canFortify ? 'Ativa escudo por 2 turnos.' : hasFortifyShield ? 'Escudo já ativo' : 'Já agiu neste turno'}
            </TooltipContent>
          </Tooltip>

          {/* Build button for Engineer */}
          {canBuild && onBuild && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBuild('tower')}
                className="flex-1 h-8 text-xs font-cinzel border-ochre/60 text-ochre hover:bg-ochre/10"
              >
                🗼 Torre
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBuild('fortress')}
                className="flex-1 h-8 text-xs font-cinzel border-ochre/60 text-ochre hover:bg-ochre/10"
              >
                🏰 Forte
              </Button>
            </div>
          )}

          {/* Destroy button for Sentinel */}
          {canDestroy && onDestroy && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDestroy}
              className="w-full h-8 text-xs font-cinzel border-red-600/60 text-red-400 hover:bg-red-900/10"
            >
              💥 Destruir Construção
            </Button>
          )}

          {/* Active Abilities */}
          {activeAbilities.length > 0 && onExecuteAbility && (
            <div className="mt-1">
              <p className="text-xs font-cinzel text-sepia/40 uppercase tracking-wider mb-1">Habilidades</p>
              {activeAbilities.map(ability => (
                <Tooltip key={ability.id}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onExecuteAbility(ability.id)}
                      disabled={unit.hasActed || ability.currentCooldown > 0}
                      className={`w-full h-8 text-xs font-cinzel mb-1 border-native-green/40 text-native-green hover:bg-native-green/10 ${
                        (unit.hasActed || ability.currentCooldown > 0) ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      ✨ {ability.name}
                      {ability.currentCooldown > 0 && (
                        <span className="ml-1 text-sepia/50">({ability.currentCooldown}t)</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[180px]">
                    {ability.description}
                    {ability.currentCooldown > 0 && ` (Recarga: ${ability.currentCooldown} turnos)`}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {/* Passive Abilities */}
          {passiveAbilities.length > 0 && (
            <div className="mt-1">
              <p className="text-xs font-cinzel text-sepia/40 uppercase tracking-wider mb-1">Passivas</p>
              {passiveAbilities.map(ability => (
                <div key={ability.id} className="flex items-center gap-1 bg-parchment/30 rounded px-2 py-0.5 mb-1">
                  <span className="text-xs">⚡</span>
                  <span className="text-xs font-fell text-sepia/60">{ability.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
