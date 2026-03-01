import type { GameUnit, Territory, GameState, Position } from '../types/game';
import { getDistance, getTerritoryAtPosition } from './gameInitializer';

function getRandomOffset(range: number): number {
  return (Math.random() - 0.5) * range * 2;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function runBotAction(
  unit: GameUnit,
  gameState: GameState,
  onMove: (unitId: string, pos: Position) => void,
  onAttack: (attackerId: string, targetId: string) => void,
  onFortify: (unitId: string) => void
): void {
  if (unit.hasMoved && unit.hasActed) return;

  const enemies = gameState.units.filter(u => u.team !== unit.team && u.health > 0);
  const allies = gameState.units.filter(u => u.team === unit.team && u.id !== unit.id);

  // Find nearest enemy
  let nearestEnemy: GameUnit | null = null;
  let minDist = Infinity;
  for (const enemy of enemies) {
    const d = getDistance(unit.position, enemy.position);
    if (d < minDist) {
      minDist = d;
      nearestEnemy = enemy;
    }
  }

  // Attack if enemy is close enough
  if (!unit.hasActed && nearestEnemy && minDist < 60) {
    onAttack(unit.id, nearestEnemy.id);
    return;
  }

  if (!unit.hasMoved) {
    let targetPos: Position;

    if (unit.team === 'Colonizers') {
      // Colonizers move toward neutral/native territories
      const targetTerritories = gameState.territories.filter(
        t => t.owner !== 'Colonizers'
      );
      if (targetTerritories.length > 0) {
        // Pick closest uncaptured territory
        let closestTerritory: Territory | null = null;
        let closestDist = Infinity;
        for (const t of targetTerritories) {
          const d = getDistance(unit.position, t.center);
          if (d < closestDist) {
            closestDist = d;
            closestTerritory = t;
          }
        }
        if (closestTerritory) {
          const dir = {
            x: closestTerritory.center.x - unit.position.x,
            y: closestTerritory.center.y - unit.position.y,
          };
          const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
          const moveAmount = Math.min(unit.movementRange * 0.8, len);
          targetPos = {
            x: clamp(unit.position.x + (dir.x / len) * moveAmount + getRandomOffset(8), 20, 880),
            y: clamp(unit.position.y + (dir.y / len) * moveAmount + getRandomOffset(8), 20, 580),
          };
        } else {
          targetPos = unit.position;
        }
      } else {
        targetPos = unit.position;
      }
    } else {
      // Native Peoples defend their territories
      const nativeTerritories = gameState.territories.filter(
        t => t.owner === 'NativePeoples' || t.owner === 'Neutral'
      );
      // If enemy is nearby, move toward them
      if (nearestEnemy && minDist < 200) {
        const dir = {
          x: nearestEnemy.position.x - unit.position.x,
          y: nearestEnemy.position.y - unit.position.y,
        };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        const moveAmount = Math.min(unit.movementRange * 0.7, len);
        targetPos = {
          x: clamp(unit.position.x + (dir.x / len) * moveAmount + getRandomOffset(8), 20, 880),
          y: clamp(unit.position.y + (dir.y / len) * moveAmount + getRandomOffset(8), 20, 580),
        };
      } else if (nativeTerritories.length > 0) {
        // Move to defend a territory
        const threatened = nativeTerritories.find(t => t.captureProgress > 0);
        const target = threatened || nativeTerritories[Math.floor(Math.random() * nativeTerritories.length)];
        const dir = {
          x: target.center.x - unit.position.x,
          y: target.center.y - unit.position.y,
        };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
        const moveAmount = Math.min(unit.movementRange * 0.6, len);
        targetPos = {
          x: clamp(unit.position.x + (dir.x / len) * moveAmount + getRandomOffset(10), 20, 880),
          y: clamp(unit.position.y + (dir.y / len) * moveAmount + getRandomOffset(10), 20, 580),
        };
      } else {
        targetPos = unit.position;
      }
    }

    onMove(unit.id, targetPos);
  }

  // After moving, try to attack or fortify
  if (!unit.hasActed) {
    const updatedEnemies = gameState.units.filter(u => u.team !== unit.team && u.health > 0);
    let closestEnemy: GameUnit | null = null;
    let closestDist = Infinity;
    for (const e of updatedEnemies) {
      const d = getDistance(unit.position, e.position);
      if (d < closestDist) {
        closestDist = d;
        closestEnemy = e;
      }
    }

    if (closestEnemy && closestDist < 70) {
      onAttack(unit.id, closestEnemy.id);
    } else {
      // Fortify if in own territory
      const currentTerritory = getTerritoryAtPosition(unit.position, gameState.territories);
      if (currentTerritory && currentTerritory.owner === unit.team) {
        onFortify(unit.id);
      }
    }
  }
}
