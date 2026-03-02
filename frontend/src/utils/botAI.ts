import { GameState, GameUnit, Territory, Team, ClassType } from '../types/game';
import { getDistance, getTerritoryAtPosition, TALENT_PATHS } from './gameInitializer';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BotAction {
  type: 'move' | 'attack' | 'ability' | 'endTurn' | 'build' | 'destroy';
  targetPosition?: { x: number; y: number };
  targetUnitId?: string;
  abilityId?: string;
  buildType?: 'tower' | 'fortress';
}

type BotRole = 'capture' | 'defend' | 'heal' | 'build' | 'destroy' | 'ambush' | 'support' | 'intercept';

interface UnitAssignment {
  unitId: string;
  role: BotRole;
  targetTerritoryId?: string;
  targetUnitId?: string;
}

/**
 * Shared team context computed ONCE per bot team turn before any unit acts.
 * All bot units on the same team consult this to avoid duplicate targeting.
 */
interface TeamContext {
  team: Team;
  // Strategic points not yet owned by this team, sorted by priority
  uncontestedPoints: Territory[];
  // Strategic points actively being captured by the enemy
  contestedByEnemy: Territory[];
  // Territories with active capture progress (any team)
  activelyCaptured: Territory[];
  // Allied units critically wounded (< 30% HP)
  criticallyWounded: GameUnit[];
  // Allied units wounded (< 60% HP)
  woundedAllies: GameUnit[];
  // Enemy constructions visible to this team
  enemyConstructions: Territory[];
  // High-value enemy targets (Engineers near Fort, Captains with allies)
  highValueEnemies: GameUnit[];
  // Role assignments: maps unitId → assignment
  assignments: Map<string, UnitAssignment>;
  // Which territory IDs are already assigned for capture (to avoid clustering)
  assignedCaptureTargets: Set<string>;
  // Which unit IDs are already assigned as heal targets
  assignedHealTargets: Set<string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getEnemyUnits(state: GameState, team: Team): GameUnit[] {
  return state.units.filter(u => u.team !== team && u.health > 0 && !u.isInvisible);
}

function getAllyUnits(state: GameState, team: Team, excludeId?: string): GameUnit[] {
  return state.units.filter(u => u.team === team && u.health > 0 && u.id !== excludeId);
}

function getBotUnitsForTeam(state: GameState, team: Team): GameUnit[] {
  return state.units.filter(u => u.team === team && u.isBot && u.health > 0);
}

function getStrategicTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.isStrategicPoint);
}

function getBuildableTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.isBuildable && !t.construction);
}

function getEnemyConstructionTerritories(state: GameState, team: Team): Territory[] {
  return state.territories.filter(t => t.construction && t.construction.owner !== team);
}

function getForestTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.terrain === 'forest');
}

function getPlainsTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.terrain === 'plains');
}

function getFortTerritories(state: GameState): Territory[] {
  return state.territories.filter(t => t.terrain === 'fort');
}

function nearestOf<T>(items: T[], getPos: (item: T) => { x: number; y: number }, from: { x: number; y: number }): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) =>
    getDistance(from, getPos(item)) < getDistance(from, getPos(best)) ? item : best
  );
}

function moveToward(unit: GameUnit, target: { x: number; y: number }, stopDistance = 10): BotAction {
  const dx = target.x - unit.position.x;
  const dy = target.y - unit.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= stopDistance) return { type: 'endTurn' };
  const moveStep = Math.min(unit.movementRange, dist - stopDistance);
  return {
    type: 'move',
    targetPosition: {
      x: clamp(unit.position.x + (dx / dist) * moveStep, 30, MAP_WIDTH - 30),
      y: clamp(unit.position.y + (dy / dist) * moveStep, 30, MAP_HEIGHT - 30),
    },
  };
}

function moveAwayFrom(unit: GameUnit, threat: { x: number; y: number }): BotAction {
  const dx = unit.position.x - threat.x;
  const dy = unit.position.y - threat.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    type: 'move',
    targetPosition: {
      x: clamp(unit.position.x + (dx / dist) * unit.movementRange, 30, MAP_WIDTH - 30),
      y: clamp(unit.position.y + (dy / dist) * unit.movementRange, 30, MAP_HEIGHT - 30),
    },
  };
}

function countAlliesNear(allies: GameUnit[], pos: { x: number; y: number }, radius: number): number {
  return allies.filter(a => getDistance(a.position, pos) <= radius).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Context Builder — runs ONCE per team turn
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a shared context for all bot units on a team.
 * Call this once before iterating over individual bot units.
 */
export function computeTeamContext(state: GameState, team: Team): TeamContext {
  const enemies = getEnemyUnits(state, team);
  const allies = getAllyUnits(state, team);
  const botUnits = getBotUnitsForTeam(state, team);

  const strategicPoints = getStrategicTerritories(state);

  const uncontestedPoints = strategicPoints
    .filter(t => t.owner !== team)
    .sort((a, b) => {
      // Prioritize: enemy-owned > neutral > partially captured by us
      const scoreA = a.owner && a.owner !== team ? 2 : a.capturingTeam === team ? 0 : 1;
      const scoreB = b.owner && b.owner !== team ? 2 : b.capturingTeam === team ? 0 : 1;
      return scoreB - scoreA;
    });

  const contestedByEnemy = state.territories.filter(t =>
    t.capturingTeam !== null && t.capturingTeam !== team && t.captureProgress > 0
  );

  const activelyCaptured = state.territories.filter(t =>
    t.captureProgress > 0 && t.captureProgress < 100
  );

  const criticallyWounded = allies.filter(a => a.health < a.maxHealth * 0.3);
  const woundedAllies = allies.filter(a => a.health < a.maxHealth * 0.6);

  const enemyConstructions = getEnemyConstructionTerritories(state, team);

  // High-value enemies: Engineers near Fort, Captains with 2+ allies nearby
  const highValueEnemies = enemies.filter(e => {
    if (e.classType === 'Engineer') {
      const nearFort = getFortTerritories(state).some(f => getDistance(e.position, f.center) < 200);
      if (nearFort) return true;
    }
    if (e.classType === 'Captain') {
      const nearbyAllies = countAlliesNear(
        state.units.filter(u => u.team === e.team && u.health > 0),
        e.position, 150
      );
      if (nearbyAllies >= 2) return true;
    }
    return false;
  });

  const assignments = new Map<string, UnitAssignment>();
  const assignedCaptureTargets = new Set<string>();
  const assignedHealTargets = new Set<string>();

  // ── Role assignment pass ──────────────────────────────────────────────────
  // 1. Assign healers first (Shaman / Missionary)
  const healerBots = botUnits.filter(u => u.classType === 'Shaman' || u.classType === 'Missionary');
  for (const healer of healerBots) {
    const woundedInRange = woundedAllies
      .filter(a => a.id !== healer.id)
      .sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth));

    if (woundedInRange.length > 0) {
      const target = woundedInRange[0];
      assignments.set(healer.id, { unitId: healer.id, role: 'heal', targetUnitId: target.id });
      assignedHealTargets.add(target.id);
      console.log(`[BotAI] ${team} ${healer.classType} (${healer.id}) → role: HEAL → target: ${target.classType}`);
    }
  }

  // 2. Assign Sentinels to destroy enemy constructions
  const sentinelBots = botUnits.filter(u => u.classType === 'Sentinel');
  for (const sentinel of sentinelBots) {
    if (enemyConstructions.length > 0) {
      const target = nearestOf(enemyConstructions, t => t.center, sentinel.position);
      if (target) {
        assignments.set(sentinel.id, { unitId: sentinel.id, role: 'destroy', targetTerritoryId: target.id });
        console.log(`[BotAI] ${team} Sentinel (${sentinel.id}) → role: DESTROY → ${target.name}`);
      }
    }
  }

  // 3. Assign Engineers to build
  const engineerBots = botUnits.filter(u => u.classType === 'Engineer');
  for (const engineer of engineerBots) {
    const buildable = getBuildableTerritories(state);
    if (buildable.length > 0) {
      const target = nearestOf(buildable, t => t.center, engineer.position);
      if (target) {
        assignments.set(engineer.id, { unitId: engineer.id, role: 'build', targetTerritoryId: target.id });
        console.log(`[BotAI] ${team} Engineer (${engineer.id}) → role: BUILD → ${target.name}`);
      }
    }
  }

  // 4. Assign intercept roles for contested territories (2+ bots per contested point)
  if (team === 'NativePeoples' && contestedByEnemy.length > 0) {
    const nonHealerNonSentinel = botUnits.filter(u =>
      !assignments.has(u.id) &&
      u.classType !== 'Shaman' &&
      u.classType !== 'Missionary' &&
      u.classType !== 'Sentinel'
    );

    for (const contested of contestedByEnemy) {
      let interceptorsAssigned = 0;
      for (const bot of nonHealerNonSentinel) {
        if (!assignments.has(bot.id) && interceptorsAssigned < 2) {
          assignments.set(bot.id, { unitId: bot.id, role: 'intercept', targetTerritoryId: contested.id });
          interceptorsAssigned++;
          console.log(`[BotAI] ${team} ${bot.classType} (${bot.id}) → role: INTERCEPT → ${contested.name}`);
        }
      }
    }
  }

  // 5. Assign capture roles for Colonizers — spread across different strategic points
  if (team === 'Colonizers') {
    const captureBots = botUnits.filter(u =>
      !assignments.has(u.id) &&
      u.classType !== 'Engineer' &&
      u.classType !== 'Missionary'
    );

    for (const bot of captureBots) {
      // Find a strategic point not yet assigned to another bot
      const availablePoint = uncontestedPoints.find(t => !assignedCaptureTargets.has(t.id));
      if (availablePoint) {
        assignments.set(bot.id, { unitId: bot.id, role: 'capture', targetTerritoryId: availablePoint.id });
        assignedCaptureTargets.add(availablePoint.id);
        console.log(`[BotAI] ${team} ${bot.classType} (${bot.id}) → role: CAPTURE → ${availablePoint.name}`);
      } else if (uncontestedPoints.length > 0) {
        // All points assigned — allow overflow to nearest uncontested
        const target = nearestOf(uncontestedPoints, t => t.center, bot.position);
        if (target) {
          assignments.set(bot.id, { unitId: bot.id, role: 'capture', targetTerritoryId: target.id });
          console.log(`[BotAI] ${team} ${bot.classType} (${bot.id}) → role: CAPTURE (overflow) → ${target.name}`);
        }
      }
    }
  }

  // 6. Remaining unassigned bots get default roles
  for (const bot of botUnits) {
    if (!assignments.has(bot.id)) {
      const role: BotRole = team === 'NativePeoples' ? 'defend' : 'capture';
      assignments.set(bot.id, { unitId: bot.id, role });
      console.log(`[BotAI] ${team} ${bot.classType} (${bot.id}) → role: ${role.toUpperCase()} (default)`);
    }
  }

  return {
    team,
    uncontestedPoints,
    contestedByEnemy,
    activelyCaptured,
    criticallyWounded,
    woundedAllies,
    enemyConstructions,
    highValueEnemies,
    assignments,
    assignedCaptureTargets,
    assignedHealTargets,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function selectTalentPathForBot(classType: ClassType): 'PathA' | 'PathB' {
  const defensiveClasses: ClassType[] = ['Sentinel', 'Missionary', 'Shaman'];
  const offensiveClasses: ClassType[] = ['ForestWarrior', 'MusketSoldier', 'SpiritHunter'];
  if (defensiveClasses.includes(classType)) return 'PathA';
  if (offensiveClasses.includes(classType)) return 'PathB';
  return 'PathA';
}

/**
 * Main entry point. Pass the pre-computed TeamContext for coordinated decisions.
 * If no context is provided, falls back to solo decision-making.
 */
export function getBotAction(unit: GameUnit, state: GameState, teamContext?: TeamContext): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  const enemies = getEnemyUnits(state, unit.team);
  const allies = getAllyUnits(state, unit.team, unit.id);
  const currentTerritory = getTerritoryAtPosition(state.territories, unit.position);
  const ctx = teamContext ?? null;

  switch (unit.classType) {
    case 'Engineer':
      return getEngineerAction(unit, state, enemies, ctx);
    case 'Sentinel':
      return getSentinelAction(unit, state, enemies, ctx);
    case 'Shaman':
    case 'Missionary':
      return getHealerAction(unit, state, allies, enemies, ctx);
    case 'Captain':
      return getCaptainAction(unit, state, allies, enemies, ctx);
    case 'ForestWarrior':
      return getForestWarriorAction(unit, state, enemies, currentTerritory, ctx);
    case 'MusketSoldier':
      return getMusketSoldierAction(unit, state, enemies, currentTerritory, ctx);
    case 'SpiritHunter':
      return getSpiritHunterAction(unit, state, enemies, ctx);
    default:
      return getDefaultAction(unit, state, enemies, ctx);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Class-specific action handlers
// ─────────────────────────────────────────────────────────────────────────────

// ── Engineer ─────────────────────────────────────────────────────────────────
function getEngineerAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  const currentTerritory = getTerritoryAtPosition(state.territories, unit.position);

  // Priority 1: Build if standing on a buildable territory (prefer Fort terrain)
  if (!unit.hasActed && currentTerritory?.isBuildable && !currentTerritory.construction) {
    const buildType = currentTerritory.terrain === 'fort' ? 'fortress' : 'tower';
    return { type: 'build', buildType };
  }

  // Priority 2: Repair allied construction if damaged and adjacent
  if (!unit.hasActed) {
    const repairAbility = unit.abilities.find(a => a.id === 'repair');
    if (repairAbility && repairAbility.currentCooldown === 0) {
      const damagedConstruction = state.territories.find(t =>
        t.construction &&
        t.construction.owner === unit.team &&
        t.construction.health < t.construction.maxHealth * 0.7 &&
        getDistance(unit.position, t.center) < unit.attackRange
      );
      if (damagedConstruction) {
        return { type: 'ability', abilityId: 'repair', targetPosition: damagedConstruction.center };
      }
    }
  }

  // Priority 3: Move toward Fort territory first (highest value build site)
  if (!unit.hasMoved) {
    const fortTerritories = getFortTerritories(state).filter(t =>
      t.isBuildable && !t.construction && t.owner === unit.team
    );
    const buildable = getBuildableTerritories(state);

    // Prefer fort, then any buildable
    const targetTerritory = fortTerritories.length > 0
      ? nearestOf(fortTerritories, t => t.center, unit.position)
      : (ctx?.assignments.get(unit.id)?.targetTerritoryId
          ? state.territories.find(t => t.id === ctx.assignments.get(unit.id)!.targetTerritoryId) ?? null
          : nearestOf(buildable, t => t.center, unit.position));

    if (targetTerritory) {
      const dist = getDistance(unit.position, targetTerritory.center);
      if (dist > 30) {
        return moveToward(unit, targetTerritory.center, 20);
      }
    }
  }

  // Fallback: stay safe, avoid melee
  const tooClose = enemies.find(e => getDistance(unit.position, e.position) < 100);
  if (!unit.hasMoved && tooClose) {
    return moveAwayFrom(unit, tooClose.position);
  }

  return { type: 'endTurn' };
}

// ── Sentinel ──────────────────────────────────────────────────────────────────
function getSentinelAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  const enemyConstructions = ctx?.enemyConstructions ?? getEnemyConstructionTerritories(state, unit.team);

  // Priority 1: Destroy enemy construction if in range
  if (!unit.hasActed && enemyConstructions.length > 0) {
    const nearest = nearestOf(enemyConstructions, t => t.center, unit.position);
    if (nearest && getDistance(unit.position, nearest.center) <= unit.attackRange) {
      const destroyAbility = unit.abilities.find(a => a.id === 'destroy');
      if (destroyAbility && destroyAbility.currentCooldown === 0) {
        return { type: 'destroy', targetPosition: nearest.center };
      }
    }
  }

  // Priority 2: Move toward nearest enemy construction
  if (!unit.hasMoved && enemyConstructions.length > 0) {
    const nearest = nearestOf(enemyConstructions, t => t.center, unit.position);
    if (nearest) {
      const dist = getDistance(unit.position, nearest.center);
      if (dist > unit.attackRange * 0.8) {
        return moveToward(unit, nearest.center, unit.attackRange * 0.6);
      }
    }
  }

  // Priority 3: Attack enemies in range
  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(e => getDistance(unit.position, e.position) <= unit.attackRange);
    if (attackable) {
      return { type: 'attack', targetUnitId: attackable.id };
    }
  }

  // Priority 4: Use barricade ability if enemies are approaching
  if (!unit.hasActed) {
    const barricade = unit.abilities.find(a => a.id === 'barricade');
    if (barricade && barricade.currentCooldown === 0) {
      const nearbyEnemy = enemies.find(e => getDistance(unit.position, e.position) < 200);
      if (nearbyEnemy) {
        return { type: 'ability', abilityId: 'barricade' };
      }
    }
  }

  // Priority 5: Defend strategic points
  if (!unit.hasMoved) {
    const strategicToDefend = getStrategicTerritories(state)
      .filter(t => t.owner === unit.team || t.capturingTeam !== null);
    const nearest = nearestOf(strategicToDefend, t => t.center, unit.position);
    if (nearest && getDistance(unit.position, nearest.center) > 60) {
      return moveToward(unit, nearest.center, 40);
    }
  }

  return getDefaultAction(unit, state, enemies, ctx);
}

// ── Healer (Shaman / Missionary) ─────────────────────────────────────────────
function getHealerAction(
  unit: GameUnit,
  state: GameState,
  allies: GameUnit[],
  enemies: GameUnit[],
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Determine heal ability
  const healAbilityId = unit.classType === 'Shaman' ? 'heal' : 'heal_ally';
  const healAbility = unit.abilities.find(a => a.id === healAbilityId);

  // Sort allies by lowest health percentage (most critical first)
  const woundedAllies = allies
    .filter(a => a.health < a.maxHealth * 0.6)
    .sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth));

  // Priority 1: Heal critically wounded ally in range
  if (!unit.hasActed && healAbility && healAbility.currentCooldown === 0 && woundedAllies.length > 0) {
    const inRangeWounded = woundedAllies.find(a =>
      getDistance(unit.position, a.position) <= unit.attackRange
    );
    if (inRangeWounded) {
      return { type: 'ability', abilityId: healAbilityId, targetUnitId: inRangeWounded.id };
    }
  }

  // Priority 2: Move toward most critically wounded ally
  if (!unit.hasMoved && woundedAllies.length > 0) {
    const mostCritical = woundedAllies[0];
    const dist = getDistance(unit.position, mostCritical.position);
    if (dist > unit.attackRange * 0.7) {
      return moveToward(unit, mostCritical.position, unit.attackRange * 0.5);
    }
  }

  // Priority 3: Use debuff ability on nearby enemy (Shaman: weaken, Missionary: pacify)
  if (!unit.hasActed && woundedAllies.length === 0) {
    const debuffId = unit.classType === 'Shaman' ? 'weaken' : 'pacify';
    const debuffAbility = unit.abilities.find(a => a.id === debuffId);
    if (debuffAbility && debuffAbility.currentCooldown === 0) {
      const nearbyEnemy = enemies.find(e => getDistance(unit.position, e.position) <= unit.attackRange);
      if (nearbyEnemy) {
        return { type: 'ability', abilityId: debuffId, targetUnitId: nearbyEnemy.id };
      }
    }
  }

  // Priority 4: Stay near ally cluster (don't wander into danger)
  if (!unit.hasMoved && allies.length > 0) {
    const avgX = allies.reduce((s, a) => s + a.position.x, 0) / allies.length;
    const avgY = allies.reduce((s, a) => s + a.position.y, 0) / allies.length;
    const clusterCenter = { x: avgX, y: avgY };
    const distToCluster = getDistance(unit.position, clusterCenter);
    if (distToCluster > 150) {
      return moveToward(unit, clusterCenter, 80);
    }
  }

  // Healers do NOT capture territories when wounded allies are within movement range
  const woundedInMoveRange = woundedAllies.filter(a =>
    getDistance(unit.position, a.position) <= unit.movementRange * 1.5
  );
  if (woundedInMoveRange.length > 0) {
    return { type: 'endTurn' };
  }

  return getDefaultAction(unit, state, enemies, ctx);
}

// ── Captain ───────────────────────────────────────────────────────────────────
function getCaptainAction(
  unit: GameUnit,
  state: GameState,
  allies: GameUnit[],
  enemies: GameUnit[],
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Find the densest cluster of allies to position near
  let bestClusterCenter = allies.length > 0
    ? { x: allies.reduce((s, a) => s + a.position.x, 0) / allies.length,
        y: allies.reduce((s, a) => s + a.position.y, 0) / allies.length }
    : null;

  // Priority 1: Use formation_buff if 2+ allies are within aura range (150)
  if (!unit.hasActed) {
    const nearbyAllies = allies.filter(a => getDistance(unit.position, a.position) < 150);
    if (nearbyAllies.length >= 2) {
      const formationBuff = unit.abilities.find(a => a.id === 'formation_buff');
      if (formationBuff && formationBuff.currentCooldown === 0) {
        return { type: 'ability', abilityId: 'formation_buff' };
      }
    }
  }

  // Priority 2: Use rally if allies are wounded
  if (!unit.hasActed) {
    const woundedNearby = allies.filter(a =>
      a.health < a.maxHealth * 0.7 && getDistance(unit.position, a.position) < 200
    );
    if (woundedNearby.length >= 1) {
      const rally = unit.abilities.find(a => a.id === 'rally');
      if (rally && rally.currentCooldown === 0) {
        return { type: 'ability', abilityId: 'rally' };
      }
    }
  }

  // Priority 3: Reposition to maximize buff aura coverage
  if (!unit.hasMoved && bestClusterCenter) {
    const distToCluster = getDistance(unit.position, bestClusterCenter);
    // Move to be at the center of the ally cluster
    if (distToCluster > 100) {
      return moveToward(unit, bestClusterCenter, 60);
    }
  }

  // Priority 4: Attack if enemies are in range
  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(e => getDistance(unit.position, e.position) <= unit.attackRange);
    if (attackable) {
      return { type: 'attack', targetUnitId: attackable.id };
    }
  }

  // Priority 5: Move toward objective with allies
  return getDefaultAction(unit, state, enemies, ctx);
}

// ── Forest Warrior ────────────────────────────────────────────────────────────
function getForestWarriorAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  currentTerritory: Territory | null,
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  const isInForest = currentTerritory?.terrain === 'forest';

  // Priority 1: Use camouflage if in forest and enemies are approaching
  if (!unit.hasActed && isInForest && !unit.isInvisible) {
    const camouflage = unit.abilities.find(a => a.id === 'camouflage');
    if (camouflage && camouflage.currentCooldown === 0) {
      const nearbyEnemy = enemies.find(e => getDistance(unit.position, e.position) < 250);
      if (nearbyEnemy) {
        return { type: 'ability', abilityId: 'camouflage' };
      }
    }
  }

  // Priority 2: Attack from forest (ambush) — only attack if in forest or invisible
  if (!unit.hasActed && (isInForest || unit.isInvisible) && enemies.length > 0) {
    const attackable = enemies.find(e => getDistance(unit.position, e.position) <= unit.attackRange);
    if (attackable) {
      return { type: 'attack', targetUnitId: attackable.id };
    }
  }

  // Priority 3: If not in forest, move to nearest forest territory near enemies
  if (!unit.hasMoved && !isInForest) {
    const forestTerritories = getForestTerritories(state);
    if (forestTerritories.length > 0 && enemies.length > 0) {
      const nearestEnemy = nearestOf(enemies, u => u.position, unit.position);
      if (nearestEnemy) {
        // Find forest territory closest to the nearest enemy (for ambush positioning)
        const ambushForest = forestTerritories.reduce((best, f) => {
          const distToEnemy = getDistance(f.center, nearestEnemy.position);
          const bestDistToEnemy = getDistance(best.center, nearestEnemy.position);
          return distToEnemy < bestDistToEnemy ? f : best;
        });
        if (getDistance(unit.position, ambushForest.center) > 60) {
          return moveToward(unit, ambushForest.center, 40);
        }
      }
    }
  }

  // Priority 4: If in forest, wait for enemies to come into range (hold position)
  if (isInForest && !unit.hasActed) {
    const enemyApproaching = enemies.find(e => getDistance(unit.position, e.position) < 300);
    if (enemyApproaching) {
      // Hold position — don't move, wait for enemy to enter attack range
      if (!unit.hasMoved) {
        // Small repositioning within forest to get closer to enemy
        const dist = getDistance(unit.position, enemyApproaching.position);
        if (dist > unit.attackRange && dist < 250) {
          return moveToward(unit, enemyApproaching.position, unit.attackRange * 0.8);
        }
      }
      return { type: 'endTurn' };
    }
  }

  // Priority 5: Intercept contested territories (from context)
  if (ctx) {
    const assignment = ctx.assignments.get(unit.id);
    if (assignment?.role === 'intercept' && assignment.targetTerritoryId) {
      const targetTerritory = state.territories.find(t => t.id === assignment.targetTerritoryId);
      if (targetTerritory && !unit.hasMoved) {
        return moveToward(unit, targetTerritory.center, 30);
      }
    }
  }

  return getDefaultAction(unit, state, enemies, ctx);
}

// ── Musket Soldier ────────────────────────────────────────────────────────────
function getMusketSoldierAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  currentTerritory: Territory | null,
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Skip turn if reloading
  if (unit.isReloading) {
    return { type: 'endTurn' };
  }

  const isInOpenField = currentTerritory?.terrain === 'plains';

  // Priority 1: Retreat if enemies are too close (maintain range advantage)
  if (!unit.hasMoved) {
    const tooCloseEnemy = enemies.find(e => getDistance(unit.position, e.position) < 90);
    if (tooCloseEnemy) {
      return moveAwayFrom(unit, tooCloseEnemy.position);
    }
  }

  // Priority 2: Use musket_fire ability if in open field (field_advantage bonus)
  if (!unit.hasActed && isInOpenField) {
    const musketFire = unit.abilities.find(a => a.id === 'musket_fire');
    if (musketFire && musketFire.currentCooldown === 0) {
      const inRangeEnemy = enemies.find(e => getDistance(unit.position, e.position) <= unit.attackRange);
      if (inRangeEnemy) {
        return { type: 'ability', abilityId: 'musket_fire', targetUnitId: inRangeEnemy.id };
      }
    }
  }

  // Priority 3: Attack from range
  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(e => getDistance(unit.position, e.position) <= unit.attackRange);
    if (attackable) {
      return { type: 'attack', targetUnitId: attackable.id };
    }
  }

  // Priority 4: Move to open field (plains) for field_advantage bonus
  if (!unit.hasMoved && !isInOpenField) {
    const plainsTerritories = getPlainsTerritories(state);
    if (plainsTerritories.length > 0) {
      // Prefer plains territories that are also strategic points
      const strategicPlains = plainsTerritories.filter(t => t.isStrategicPoint);
      const targetPlains = strategicPlains.length > 0
        ? nearestOf(strategicPlains, t => t.center, unit.position)
        : nearestOf(plainsTerritories, t => t.center, unit.position);

      if (targetPlains && getDistance(unit.position, targetPlains.center) > 80) {
        return moveToward(unit, targetPlains.center, 50);
      }
    }
  }

  // Priority 5: Move toward enemies while maintaining safe distance
  if (!unit.hasMoved && enemies.length > 0) {
    const nearestEnemy = nearestOf(enemies, u => u.position, unit.position);
    if (nearestEnemy) {
      const dist = getDistance(unit.position, nearestEnemy.position);
      const idealRange = unit.attackRange * 0.85;
      if (dist > unit.attackRange) {
        return moveToward(unit, nearestEnemy.position, idealRange);
      }
    }
  }

  return getDefaultAction(unit, state, enemies, ctx);
}

// ── Spirit Hunter ─────────────────────────────────────────────────────────────
function getSpiritHunterAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  const highValueTargets = ctx?.highValueEnemies ?? [];

  // Priority 1: Mark a high-value enemy (Engineer near Fort, Captain with allies)
  if (!unit.hasActed && !unit.markedEnemyId) {
    const markAbility = unit.abilities.find(a => a.id === 'mark_enemy');
    if (markAbility && markAbility.currentCooldown === 0) {
      // Prefer high-value targets
      const priorityTarget = highValueTargets.find(e =>
        getDistance(unit.position, e.position) <= unit.attackRange * 1.5
      );
      const anyTarget = enemies.find(e =>
        getDistance(unit.position, e.position) <= unit.attackRange * 1.5
      );
      const markTarget = priorityTarget ?? anyTarget;
      if (markTarget) {
        return { type: 'ability', abilityId: 'mark_enemy', targetUnitId: markTarget.id };
      }
    }
  }

  // Priority 2: Attack marked enemy if in range
  if (!unit.hasActed && unit.markedEnemyId) {
    const markedEnemy = enemies.find(e => e.id === unit.markedEnemyId);
    if (markedEnemy && getDistance(unit.position, markedEnemy.position) <= unit.attackRange) {
      return { type: 'attack', targetUnitId: markedEnemy.id };
    }
    // Move toward marked enemy
    if (!unit.hasMoved && markedEnemy) {
      return moveToward(unit, markedEnemy.position, unit.attackRange * 0.8);
    }
  }

  // Priority 3: Place trap on contested territory
  if (!unit.hasActed) {
    const trapAbility = unit.abilities.find(a => a.id === 'trap');
    if (trapAbility && trapAbility.currentCooldown === 0) {
      const contestedNearby = ctx?.contestedByEnemy.find(t =>
        getDistance(unit.position, t.center) < unit.attackRange
      );
      if (contestedNearby) {
        return { type: 'ability', abilityId: 'trap', targetPosition: contestedNearby.center };
      }
    }
  }

  // Priority 4: Move toward high-value target
  if (!unit.hasMoved && highValueTargets.length > 0) {
    const nearest = nearestOf(highValueTargets, u => u.position, unit.position);
    if (nearest) {
      const dist = getDistance(unit.position, nearest.position);
      if (dist > unit.attackRange) {
        return moveToward(unit, nearest.position, unit.attackRange * 0.8);
      }
    }
  }

  return getDefaultAction(unit, state, enemies, ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default action (fallback for all classes)
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: 'endTurn' };

  // Attack if possible
  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(e =>
      getDistance(unit.position, e.position) <= unit.attackRange
    );
    if (attackable) {
      return { type: 'attack', targetUnitId: attackable.id };
    }
  }

  // Move toward objectives
  if (!unit.hasMoved) {
    let target: { x: number; y: number } | null = null;

    if (unit.team === 'Colonizers') {
      // Check context assignment first
      if (ctx) {
        const assignment = ctx.assignments.get(unit.id);
        if (assignment?.targetTerritoryId) {
          const assignedTerritory = state.territories.find(t => t.id === assignment.targetTerritoryId);
          if (assignedTerritory) {
            target = assignedTerritory.center;
          }
        }
      }

      // Fallback: find nearest uncontrolled strategic point not already assigned
      if (!target) {
        const uncontrolled = state.territories
          .filter(t => t.isStrategicPoint && t.owner !== 'Colonizers')
          .sort((a, b) => getDistance(unit.position, a.center) - getDistance(unit.position, b.center));

        // Prefer points not already targeted by teammates
        const unassigned = uncontrolled.filter(t =>
          !ctx?.assignedCaptureTargets.has(t.id)
        );
        const chosen = unassigned.length > 0 ? unassigned[0] : uncontrolled[0];
        if (chosen) target = chosen.center;
      }

      // Last resort: any uncontrolled territory
      if (!target) {
        const anyUncontrolled = state.territories
          .filter(t => t.owner !== 'Colonizers')
          .sort((a, b) => getDistance(unit.position, a.center) - getDistance(unit.position, b.center));
        if (anyUncontrolled.length > 0) target = anyUncontrolled[0].center;
      }

    } else {
      // Natives: intercept colonizers capturing territories
      if (ctx) {
        const assignment = ctx.assignments.get(unit.id);
        if (assignment?.role === 'intercept' && assignment.targetTerritoryId) {
          const t = state.territories.find(t => t.id === assignment.targetTerritoryId);
          if (t) target = t.center;
        }
      }

      if (!target) {
        // Intercept active captures
        const colonizersCapturing = state.territories.filter(t =>
          t.capturingTeam === 'Colonizers' && t.owner !== 'Colonizers'
        );
        if (colonizersCapturing.length > 0) {
          const nearest = nearestOf(colonizersCapturing, t => t.center, unit.position);
          if (nearest) target = nearest.center;
        }
      }

      if (!target && enemies.length > 0) {
        const nearestEnemy = nearestOf(enemies, u => u.position, unit.position);
        if (nearestEnemy) target = nearestEnemy.position;
      }

      // Defend own strategic points
      if (!target) {
        const ownStrategic = getStrategicTerritories(state).filter(t => t.owner === unit.team);
        const nearest = nearestOf(ownStrategic, t => t.center, unit.position);
        if (nearest) target = nearest.center;
      }
    }

    if (target) {
      const dist = getDistance(unit.position, target);
      if (dist > 20) {
        return moveToward(unit, target, 15);
      }
    }
  }

  return { type: 'endTurn' };
}
