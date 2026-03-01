import React from 'react';
import type { GameUnit, Territory } from '../types/game';
import { Button } from '@/components/ui/button';
import { Sword, Shield, Move, X } from 'lucide-react';
import { getDistance } from '../utils/gameInitializer';

interface UnitActionPanelProps {
  unit: GameUnit;
  allUnits: GameUnit[];
  territories: Territory[];
  onAttack: (targetId: string) => void;
  onFortify: () => void;
  onDeselect: () => void;
  isMoving: boolean;
  onToggleMove: () => void;
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
}: UnitActionPanelProps) {
  const enemies = allUnits.filter(
    u => u.team !== unit.team && u.health > 0 && getDistance(unit.position, u.position) <= 80
  );

  const isNative = unit.team === 'NativePeoples';
  const teamColor = isNative ? 'text-native-green' : 'text-colonizer-red';
  const teamBorder = isNative ? 'border-native-green' : 'border-colonizer-red';
  const teamBg = isNative ? 'bg-native-green/10' : 'bg-colonizer-red/10';

  return (
    <div className={`ornate-border rounded-sm p-3 ${teamBg} min-w-[200px]`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={`font-cinzel text-xs font-bold ${teamColor}`}>
            {isNative ? '🌿' : '⚔️'} Unidade Selecionada
          </p>
          <p className="font-fell text-xs text-sepia/70">
            {isNative ? 'Guerreiro Nativo' : 'Conquistador'}
          </p>
        </div>
        <button onClick={onDeselect} className="text-sepia/50 hover:text-sepia">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Health bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs font-fell text-sepia/70 mb-0.5">
          <span>Vida</span>
          <span>{Math.round(unit.health)}/{unit.maxHealth}</span>
        </div>
        <div className="w-full h-2 bg-sepia/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isNative ? 'health-bar-native' : 'health-bar-colonizer'}`}
            style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 mb-3 text-center">
        <div className="bg-parchment/60 rounded-sm p-1">
          <p className="text-xs font-cinzel text-sepia/50">ATK</p>
          <p className="text-sm font-bold text-sepia">{unit.attack}</p>
        </div>
        <div className="bg-parchment/60 rounded-sm p-1">
          <p className="text-xs font-cinzel text-sepia/50">DEF</p>
          <p className="text-sm font-bold text-sepia">{unit.defense}{unit.isFortified ? '+' : ''}</p>
        </div>
        <div className="bg-parchment/60 rounded-sm p-1">
          <p className="text-xs font-cinzel text-sepia/50">MOV</p>
          <p className="text-sm font-bold text-sepia">{unit.movementRange}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-1.5">
        <Button
          size="sm"
          variant={isMoving ? 'default' : 'outline'}
          onClick={onToggleMove}
          disabled={unit.hasMoved}
          className={`w-full h-7 text-xs font-cinzel ${
            unit.hasMoved ? 'opacity-40' : ''
          } ${isMoving ? 'bg-ochre text-sepia border-ochre' : 'border-sepia/40 text-sepia'}`}
        >
          <Move className="w-3 h-3 mr-1" />
          {isMoving ? 'Cancelar Mover' : 'Mover'}
          {unit.hasMoved && ' ✓'}
        </Button>

        {enemies.length > 0 ? (
          enemies.map(enemy => (
            <Button
              key={enemy.id}
              size="sm"
              variant="outline"
              onClick={() => onAttack(enemy.id)}
              disabled={unit.hasActed}
              className={`w-full h-7 text-xs font-cinzel border-deep-red/60 text-deep-red hover:bg-deep-red/10 ${
                unit.hasActed ? 'opacity-40' : ''
              }`}
            >
              <Sword className="w-3 h-3 mr-1" />
              Atacar Inimigo
              {unit.hasActed && ' ✓'}
            </Button>
          ))
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="w-full h-7 text-xs font-cinzel border-sepia/20 text-sepia/30"
          >
            <Sword className="w-3 h-3 mr-1" />
            Sem Alvos
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onFortify}
          disabled={unit.hasActed || unit.isFortified}
          className={`w-full h-7 text-xs font-cinzel border-forest-green/60 text-forest-green hover:bg-forest-green/10 ${
            unit.hasActed || unit.isFortified ? 'opacity-40' : ''
          }`}
        >
          <Shield className="w-3 h-3 mr-1" />
          {unit.isFortified ? 'Fortif. ✓' : 'Fortalecer'}
        </Button>
      </div>

      {unit.isFortified && (
        <p className="text-xs font-fell italic text-forest-green mt-1 text-center">
          🛡 Defesa aumentada
        </p>
      )}
    </div>
  );
}
