import { GameState, GameUnit, Territory, Team, ClassType } from '../types/game';
import { getDistance, getTerritoryAtPosition, TALENT_PATHS } from './gameInitializer';

interface BotAction {
  type: 'move' | 'attack' | 'ability' | 'endTurn' | 'build' | 'destroy';
  targetPosition?: { x: number; y: number };
  targetUnitId?: string;
  abilityId?: string;
  buildType?: 'tower' | 'fortress';
}

function getTerritoriesOwnedBy(state: GameState, team: Team): Territory[] {
  return state.territories.filter(t => t.owner === team);
}

function getUncontrolledTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.owner !== 'Colonizers');
}

function getEnemyUnits(state: GameState, team: Team): GameUnit[] {
  return state.units.filter(u => u.team !== team && u.health > 0 && !u.isInvisible);
}

function getAllyUnits(state: GameState, team: Team, excludeId: string): GameUnit[] {
  return state.units.filter(u => u.team === team && u.health > 0 && u.id !== excludeId);
}

function getStrategicTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.isStrategicPoint);
}

function getBuildableTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.isBuildable && !t.construction);
}

function getEnemyConstructions(state: GameState, team: Team): Territory[] {
  return state.territories.filter(t => t.construction && t.construction.owner !== team);
}

export function selectTalentPathForBot(classType: ClassType): 'PathA' | 'PathB' {
  const defensiveClasses: ClassType[] = ['Sentinel', 'Missionary', 'Shaman'];
  const offensiveClasses: ClassType[] = ['ForestWarrior', 'MusketSoldier', 'SpiritHunter'];
  
  if (defensiveClasses.includes(classType)) return 'PathA';
  if (offensiveClasses.includes(classType)) return 'PathB';
  return 'PathA'; // utility classes default to PathA
}

export function getBotAction(unit: GameUnit, state: GameState): BotAction {
  const enemies = getEnemyUnits(state, unit.team);
  const allies = getAllyUnits(state, unit.team, unit.id);
  const currentTerritory = getTerritoryAtPosition(state.territories, unit.position);

  // Class-specific behavior
  switch (unit.classType) {
    case 'Engineer':
      return getEngineerAction(unit, state, enemies);
    case 'Sentinel':
      return getSentinelAction(unit, state, enemies);
    case 'Shaman':
    case 'Missionary':
      return getHealerAction(unit, state, allies, enemies);
    case 'Captain':
      return getCaptainAction(unit, state, allies, enemies);
    case 'ForestWarrior':
      return getForestWarriorAction(unit, state, enemies, currentTerritory);
    case 'MusketSoldier':
      return getMusketSoldierAction(unit, state, enemies, currentTerritory);
    case 'SpiritHunter':
      return getSpiritHunterAction(unit, state, enemies);
    default:
      return getDefaultAction(unit, state, enemies);
  }
}

function getEngineerAction(unit: GameUnit, state: GameState, enemies: GameUnit[]): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Try to build if on buildable territory
  const currentTerritory = getTerritoryAtPosition(state.territories, unit.position);
  if (!unit.hasActed && currentTerritory?.isBuildable && !currentTerritory.construction) {
    return { type: 'build', buildType: 'tower' };
  }

  // Move toward buildable territory
  if (!unit.hasMoved) {
    const buildable = getBuildableTerritories(state);
    if (buildable.length > 0) {
      const nearest = buildable.reduce((a, b) =>
        getDistance(unit.position, a.center) < getDistance(unit.position, b.center) ? a : b
      );
      const dx = nearest.center.x - unit.position.x;
      const dy = nearest.center.y - unit.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveStep = Math.min(unit.movementRange, dist);
      return {
        type: 'move',
        targetPosition: {
          x: unit.position.x + (dx / dist) * moveStep,
          y: unit.position.y + (dy / dist) * moveStep,
        },
      };
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getSentinelAction(unit: GameUnit, state: GameState, enemies: GameUnit[]): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Destroy enemy constructions
  if (!unit.hasActed) {
    const enemyConstructions = getEnemyConstructions(state, unit.team);
    if (enemyConstructions.length > 0) {
      const nearest = enemyConstructions.reduce((a, b) =>
        getDistance(unit.position, a.center) < getDistance(unit.position, b.center) ? a : b
      );
      if (getDistance(unit.position, nearest.center) < unit.attackRange) {
        return { type: 'destroy', targetPosition: nearest.center };
      }
    }
  }

  // Defend strategic points
  if (!unit.hasMoved) {
    const strategicTerritories = getStrategicTerritories(state).filter(t => t.owner === unit.team || t.owner === null);
    if (strategicTerritories.length > 0) {
      const nearest = strategicTerritories.reduce((a, b) =>
        getDistance(unit.position, a.center) < getDistance(unit.position, b.center) ? a : b
      );
      const dx = nearest.center.x - unit.position.x;
      const dy = nearest.center.y - unit.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 30) {
        const moveStep = Math.min(unit.movementRange, dist);
        return {
          type: 'move',
          targetPosition: {
            x: unit.position.x + (dx / dist) * moveStep,
            y: unit.position.y + (dy / dist) * moveStep,
          },
        };
      }
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getHealerAction(unit: GameUnit, state: GameState, allies: GameUnit[], enemies: GameUnit[]): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Heal low-health allies
  if (!unit.hasActed) {
    const woundedAlly = allies
      .filter(a => a.health < a.maxHealth * 0.6)
      .sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth))[0];

    if (woundedAlly && getDistance(unit.position, woundedAlly.position) < unit.attackRange) {
      const healAbility = unit.abilities.find(a => a.id === 'heal' || a.id === 'heal_ally');
      if (healAbility && healAbility.currentCooldown === 0) {
        return { type: 'ability', abilityId: healAbility.id, targetUnitId: woundedAlly.id };
      }
    }

    // Move toward wounded ally
    if (!unit.hasMoved && woundedAlly) {
      const dx = woundedAlly.position.x - unit.position.x;
      const dy = woundedAlly.position.y - unit.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > unit.attackRange * 0.8) {
        const moveStep = Math.min(unit.movementRange, dist - unit.attackRange * 0.5);
        return {
          type: 'move',
          targetPosition: {
            x: unit.position.x + (dx / dist) * moveStep,
            y: unit.position.y + (dy / dist) * moveStep,
          },
        };
      }
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getCaptainAction(unit: GameUnit, state: GameState, allies: GameUnit[], enemies: GameUnit[]): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Use formation buff if allies are nearby
  if (!unit.hasActed) {
    const nearbyAllies = allies.filter(a => getDistance(unit.position, a.position) < 150);
    if (nearbyAllies.length >= 2) {
      const buffAbility = unit.abilities.find(a => a.id === 'formation_buff');
      if (buffAbility && buffAbility.currentCooldown === 0) {
        return { type: 'ability', abilityId: 'formation_buff' };
      }
    }
  }

  // Move toward ally cluster
  if (!unit.hasMoved && allies.length > 0) {
    const avgX = allies.reduce((sum, a) => sum + a.position.x, 0) / allies.length;
    const avgY = allies.reduce((sum, a) => sum + a.position.y, 0) / allies.length;
    const dx = avgX - unit.position.x;
    const dy = avgY - unit.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 100) {
      const moveStep = Math.min(unit.movementRange, dist - 80);
      return {
        type: 'move',
        targetPosition: {
          x: unit.position.x + (dx / dist) * moveStep,
          y: unit.position.y + (dy / dist) * moveStep,
        },
      };
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getForestWarriorAction(unit: GameUnit, state: GameState, enemies: GameUnit[], currentTerritory: Territory | null): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Seek forest tiles before engaging
  if (!unit.hasMoved && currentTerritory?.terrain !== 'forest') {
    const forestTerritories = state.territories.filter(t => t.terrain === 'forest' && t.owner === unit.team);
    if (forestTerritories.length > 0 && enemies.length > 0) {
      const nearestEnemy = enemies.reduce((a, b) =>
        getDistance(unit.position, a.position) < getDistance(unit.position, b.position) ? a : b
      );
      // Find forest territory near enemy
      const goodForest = forestTerritories.find(f =>
        getDistance(f.center, nearestEnemy.position) < 300
      );
      if (goodForest && getDistance(unit.position, goodForest.center) > 80) {
        const dx = goodForest.center.x - unit.position.x;
        const dy = goodForest.center.y - unit.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveStep = Math.min(unit.movementRange, dist);
        return {
          type: 'move',
          targetPosition: {
            x: unit.position.x + (dx / dist) * moveStep,
            y: unit.position.y + (dy / dist) * moveStep,
          },
        };
      }
    }
  }

  // Use camouflage if enemies are close
  if (!unit.hasActed && !unit.isInvisible) {
    const camouflage = unit.abilities.find(a => a.id === 'camouflage');
    if (camouflage && camouflage.currentCooldown === 0) {
      const nearbyEnemy = enemies.find(e => getDistance(unit.position, e.position) < 200);
      if (nearbyEnemy) {
        return { type: 'ability', abilityId: 'camouflage' };
      }
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getMusketSoldierAction(unit: GameUnit, state: GameState, enemies: GameUnit[], currentTerritory: Territory | null): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Avoid melee range, seek open fields
  if (!unit.hasMoved) {
    const tooCloseEnemy = enemies.find(e => getDistance(unit.position, e.position) < 80);
    if (tooCloseEnemy) {
      // Retreat
      const dx = unit.position.x - tooCloseEnemy.position.x;
      const dy = unit.position.y - tooCloseEnemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return {
        type: 'move',
        targetPosition: {
          x: Math.max(50, Math.min(MAP_WIDTH - 50, unit.position.x + (dx / dist) * unit.movementRange)),
          y: Math.max(50, Math.min(MAP_HEIGHT - 50, unit.position.y + (dy / dist) * unit.movementRange)),
        },
      };
    }

    // Seek open field
    if (currentTerritory?.terrain !== 'plains') {
      const plainsTerritories = state.territories.filter(t => t.terrain === 'plains');
      if (plainsTerritories.length > 0) {
        const nearest = plainsTerritories.reduce((a, b) =>
          getDistance(unit.position, a.center) < getDistance(unit.position, b.center) ? a : b
        );
        if (getDistance(unit.position, nearest.center) > 80) {
          const dx = nearest.center.x - unit.position.x;
          const dy = nearest.center.y - unit.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const moveStep = Math.min(unit.movementRange, dist);
          return {
            type: 'move',
            targetPosition: {
              x: unit.position.x + (dx / dist) * moveStep,
              y: unit.position.y + (dy / dist) * moveStep,
            },
          };
        }
      }
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getSpiritHunterAction(unit: GameUnit, state: GameState, enemies: GameUnit[]): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Mark high-value enemy before attacking
  if (!unit.hasActed && !unit.markedEnemyId) {
    const markAbility = unit.abilities.find(a => a.id === 'mark_enemy');
    if (markAbility && markAbility.currentCooldown === 0 && enemies.length > 0) {
      const highValueEnemy = enemies.reduce((a, b) => a.health > b.health ? a : b);
      if (getDistance(unit.position, highValueEnemy.position) < unit.attackRange * 1.5) {
        return { type: 'ability', abilityId: 'mark_enemy', targetUnitId: highValueEnemy.id };
      }
    }
  }

  return getDefaultAction(unit, state, enemies);
}

function getDefaultAction(unit: GameUnit, state: GameState, enemies: GameUnit[]): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Attack if possible
  if (!unit.hasActed && enemies.length > 0) {
    const attackableEnemy = enemies.find(e =>
      getDistance(unit.position, e.position) <= unit.attackRange
    );
    if (attackableEnemy) {
      return { type: 'attack', targetUnitId: attackableEnemy.id };
    }
  }

  // Move toward objectives
  if (!unit.hasMoved) {
    let target: { x: number; y: number } | null = null;

    if (unit.team === 'Colonizers') {
      // Colonizers: capture strategic points
      const uncontrolled = state.territories
        .filter(t => t.isStrategicPoint && t.owner !== 'Colonizers')
        .sort((a, b) => getDistance(unit.position, a.center) - getDistance(unit.position, b.center));

      if (uncontrolled.length > 0) {
        target = uncontrolled[0].center;
      } else {
        // Capture any uncontrolled territory
        const anyUncontrolled = state.territories
          .filter(t => t.owner !== 'Colonizers')
          .sort((a, b) => getDistance(unit.position, a.center) - getDistance(unit.position, b.center));
        if (anyUncontrolled.length > 0) target = anyUncontrolled[0].center;
      }
    } else {
      // Natives: intercept colonizers and defend strategic points
      const colonizersCapturing = state.territories.filter(t =>
        t.capturingTeam === 'Colonizers' && t.owner !== 'Colonizers'
      );

      if (colonizersCapturing.length > 0) {
        const nearest = colonizersCapturing.reduce((a, b) =>
          getDistance(unit.position, a.center) < getDistance(unit.position, b.center) ? a : b
        );
        target = nearest.center;
      } else if (enemies.length > 0) {
        const nearestEnemy = enemies.reduce((a, b) =>
          getDistance(unit.position, a.position) < getDistance(unit.position, b.position) ? a : b
        );
        target = nearestEnemy.position;
      }
    }

    if (target) {
      const dx = target.x - unit.position.x;
      const dy = target.y - unit.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 20) {
        const moveStep = Math.min(unit.movementRange, dist - 10);
        return {
          type: 'move',
          targetPosition: {
            x: unit.position.x + (dx / dist) * moveStep,
            y: unit.position.y + (dy / dist) * moveStep,
          },
        };
      }
    }
  }

  return { type: 'endTurn' };
}

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;
