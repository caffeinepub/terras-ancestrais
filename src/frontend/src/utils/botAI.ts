import type {
  ClassType,
  GameState,
  GameUnit,
  Team,
  Territory,
} from "../types/game";
import {
  TALENT_PATHS,
  getDistance,
  getTerritoryAtPosition,
} from "./gameInitializer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BotAction {
  type: "move" | "attack" | "ability" | "endTurn" | "build" | "destroy";
  targetPosition?: { x: number; y: number };
  targetUnitId?: string;
  abilityId?: string;
  buildType?: "tower" | "fortress";
}

// New role types for teammate bots
export type BotRole =
  | "follow_support"
  | "dominate"
  | "protect"
  | "capture"
  | "defend"
  | "heal"
  | "build"
  | "destroy"
  | "ambush"
  | "intercept";

interface UnitAssignment {
  unitId: string;
  role: BotRole;
  targetTerritoryId?: string;
  targetUnitId?: string;
}

/**
 * Shared team context computed ONCE per bot team turn before any unit acts.
 */
export interface TeamContext {
  team: Team;
  uncontestedPoints: Territory[];
  contestedByEnemy: Territory[];
  criticallyWounded: GameUnit[];
  woundedAllies: GameUnit[];
  enemyConstructions: Territory[];
  highValueEnemies: GameUnit[];
  assignments: Map<string, UnitAssignment>;
  assignedCaptureTargets: Set<string>;
  assignedHealTargets: Set<string>;
  // For teammate role system
  hasHumanOnTeam: boolean;
  humanUnit?: GameUnit;
  protectedTerritoryIds: Set<string>;
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
  return state.units.filter(
    (u) => u.team !== team && u.health > 0 && !u.isInvisible,
  );
}

function getAllyUnits(
  state: GameState,
  team: Team,
  excludeId?: string,
): GameUnit[] {
  return state.units.filter(
    (u) => u.team === team && u.health > 0 && u.id !== excludeId,
  );
}

function getBotUnitsForTeam(state: GameState, team: Team): GameUnit[] {
  return state.units.filter((u) => u.team === team && u.isBot && u.health > 0);
}

function getStrategicTerritories(state: GameState): Territory[] {
  return state.territories.filter((t) => t.isStrategicPoint);
}

function getBuildableTerritories(state: GameState): Territory[] {
  return state.territories.filter((t) => t.isBuildable && !t.construction);
}

function getEnemyConstructionTerritories(
  state: GameState,
  team: Team,
): Territory[] {
  return state.territories.filter(
    (t) => t.construction && t.construction.owner !== team,
  );
}

function getForestTerritories(state: GameState): Territory[] {
  return state.territories.filter((t) => t.terrain === "forest");
}

function getFortTerritories(state: GameState): Territory[] {
  return state.territories.filter((t) => t.terrain === "fort");
}

function nearestOf<T>(
  items: T[],
  getPos: (item: T) => { x: number; y: number },
  from: { x: number; y: number },
): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, item) =>
    getDistance(from, getPos(item)) < getDistance(from, getPos(best))
      ? item
      : best,
  );
}

function moveToward(
  unit: GameUnit,
  target: { x: number; y: number },
  stopDistance = 10,
): BotAction {
  const dx = target.x - unit.position.x;
  const dy = target.y - unit.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= stopDistance) return { type: "endTurn" };
  const moveStep = Math.min(unit.movementRange, dist - stopDistance);
  return {
    type: "move",
    targetPosition: {
      x: clamp(unit.position.x + (dx / dist) * moveStep, 30, MAP_WIDTH - 30),
      y: clamp(unit.position.y + (dy / dist) * moveStep, 30, MAP_HEIGHT - 30),
    },
  };
}

function moveAwayFrom(
  unit: GameUnit,
  threat: { x: number; y: number },
): BotAction {
  const dx = unit.position.x - threat.x;
  const dy = unit.position.y - threat.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    type: "move",
    targetPosition: {
      x: clamp(
        unit.position.x + (dx / dist) * unit.movementRange,
        30,
        MAP_WIDTH - 30,
      ),
      y: clamp(
        unit.position.y + (dy / dist) * unit.movementRange,
        30,
        MAP_HEIGHT - 30,
      ),
    },
  };
}

function countAlliesNear(
  allies: GameUnit[],
  pos: { x: number; y: number },
  radius: number,
): number {
  return allies.filter((a) => getDistance(a.position, pos) <= radius).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Context Builder — runs ONCE per team turn
// ─────────────────────────────────────────────────────────────────────────────

export function computeTeamContext(
  state: GameState,
  team: Team,
  players?: Array<{ id: string; isBot: boolean; team: Team }>,
): TeamContext {
  const enemies = getEnemyUnits(state, team);
  const allies = getAllyUnits(state, team);
  const botUnits = getBotUnitsForTeam(state, team);

  const strategicPoints = getStrategicTerritories(state);

  const uncontestedPoints = strategicPoints
    .filter((t) => t.owner !== team)
    .sort((a, b) => {
      const scoreA =
        a.owner && a.owner !== team ? 2 : a.capturingTeam === team ? 0 : 1;
      const scoreB =
        b.owner && b.owner !== team ? 2 : b.capturingTeam === team ? 0 : 1;
      return scoreB - scoreA;
    });

  const contestedByEnemy = state.territories.filter(
    (t) =>
      t.capturingTeam !== null &&
      t.capturingTeam !== team &&
      t.captureProgress > 0,
  );

  const criticallyWounded = allies.filter((a) => a.health < a.maxHealth * 0.3);
  const woundedAllies = allies.filter((a) => a.health < a.maxHealth * 0.6);

  const enemyConstructions = getEnemyConstructionTerritories(state, team);

  const highValueEnemies = enemies.filter((e) => {
    if (e.classType === "Engineer") {
      const nearFort = getFortTerritories(state).some(
        (f) => getDistance(e.position, f.center) < 200,
      );
      if (nearFort) return true;
    }
    if (e.classType === "Captain") {
      const nearbyAllies = countAlliesNear(
        state.units.filter((u) => u.team === e.team && u.health > 0),
        e.position,
        150,
      );
      if (nearbyAllies >= 2) return true;
    }
    return false;
  });

  const assignments = new Map<string, UnitAssignment>();
  const assignedCaptureTargets = new Set<string>();
  const assignedHealTargets = new Set<string>();
  const protectedTerritoryIds = new Set<string>();

  // Determine if this team has a human player
  const hasHumanOnTeam = players
    ? players.some((p) => p.team === team && !p.isBot)
    : false;
  const humanPlayer = players
    ? players.find((p) => p.team === team && !p.isBot)
    : undefined;
  const humanUnit = humanPlayer
    ? state.units.find((u) => u.playerId === humanPlayer.id && u.health > 0)
    : undefined;

  if (hasHumanOnTeam) {
    // ── Teammate bot role assignment ──────────────────────────────────────
    const friendlyStrategic = strategicPoints.filter((t) => t.owner === team);
    const enemyOrNeutralStrategic = strategicPoints.filter(
      (t) => t.owner !== team,
    );
    const losingTerritory =
      enemyOrNeutralStrategic.length > friendlyStrategic.length;

    // Identify threatened friendly strategic territories (enemy unit nearby)
    const threatenedTerritories = friendlyStrategic.filter((t) =>
      enemies.some((e) => getDistance(e.position, t.center) < 150),
    );
    const heavilyThreatened = threatenedTerritories.length >= 2;

    for (const bot of botUnits) {
      const isHealer =
        bot.classType === "Shaman" || bot.classType === "Missionary";
      const isEngineer = bot.classType === "Engineer";
      const isSentinel = bot.classType === "Sentinel";

      // Healers always follow & support
      if (isHealer) {
        assignments.set(bot.id, {
          unitId: bot.id,
          role: "follow_support",
          targetUnitId: humanUnit?.id,
        });
        continue;
      }

      // Engineers prefer dominate (capture)
      if (isEngineer && enemyOrNeutralStrategic.length > 0) {
        const target = nearestOf(
          enemyOrNeutralStrategic,
          (t) => t.center,
          bot.position,
        );
        if (target) {
          assignments.set(bot.id, {
            unitId: bot.id,
            role: "dominate",
            targetTerritoryId: target.id,
          });
          continue;
        }
      }

      // Sentinels prefer protect when there are threatened territories
      if (isSentinel && threatenedTerritories.length > 0) {
        const unprotected = threatenedTerritories.find(
          (t) => !protectedTerritoryIds.has(t.id),
        );
        if (unprotected) {
          protectedTerritoryIds.add(unprotected.id);
          assignments.set(bot.id, {
            unitId: bot.id,
            role: "protect",
            targetTerritoryId: unprotected.id,
          });
          continue;
        }
      }

      // Dynamic role based on game state
      if (heavilyThreatened && threatenedTerritories.length > 0) {
        const unprotected = threatenedTerritories.find(
          (t) => !protectedTerritoryIds.has(t.id),
        );
        if (unprotected) {
          protectedTerritoryIds.add(unprotected.id);
          assignments.set(bot.id, {
            unitId: bot.id,
            role: "protect",
            targetTerritoryId: unprotected.id,
          });
          continue;
        }
      }

      if (losingTerritory && enemyOrNeutralStrategic.length > 0) {
        const target = nearestOf(
          enemyOrNeutralStrategic,
          (t) => t.center,
          bot.position,
        );
        if (target) {
          assignments.set(bot.id, {
            unitId: bot.id,
            role: "dominate",
            targetTerritoryId: target.id,
          });
          continue;
        }
      }

      // Default: follow & support the human player
      assignments.set(bot.id, {
        unitId: bot.id,
        role: "follow_support",
        targetUnitId: humanUnit?.id,
      });
    }
  } else {
    // ── Original enemy bot role assignment ────────────────────────────────
    // 1. Assign healers first
    const healerBots = botUnits.filter(
      (u) => u.classType === "Shaman" || u.classType === "Missionary",
    );
    for (const healer of healerBots) {
      const woundedInRange = woundedAllies
        .filter((a) => a.id !== healer.id)
        .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth);
      if (woundedInRange.length > 0) {
        const target = woundedInRange[0];
        assignments.set(healer.id, {
          unitId: healer.id,
          role: "heal",
          targetUnitId: target.id,
        });
        assignedHealTargets.add(target.id);
      }
    }

    // 2. Assign Sentinels to destroy enemy constructions
    const sentinelBots = botUnits.filter((u) => u.classType === "Sentinel");
    for (const sentinel of sentinelBots) {
      if (enemyConstructions.length > 0) {
        const target = nearestOf(
          enemyConstructions,
          (t) => t.center,
          sentinel.position,
        );
        if (target) {
          assignments.set(sentinel.id, {
            unitId: sentinel.id,
            role: "destroy",
            targetTerritoryId: target.id,
          });
        }
      }
    }

    // 3. Assign Engineers to build
    const engineerBots = botUnits.filter((u) => u.classType === "Engineer");
    for (const engineer of engineerBots) {
      const buildable = getBuildableTerritories(state);
      if (buildable.length > 0) {
        const target = nearestOf(buildable, (t) => t.center, engineer.position);
        if (target) {
          assignments.set(engineer.id, {
            unitId: engineer.id,
            role: "build",
            targetTerritoryId: target.id,
          });
        }
      }
    }

    // 4. Intercept contested territories
    if (team === "NativePeoples" && contestedByEnemy.length > 0) {
      const nonHealerNonSentinel = botUnits.filter(
        (u) =>
          !assignments.has(u.id) &&
          u.classType !== "Shaman" &&
          u.classType !== "Missionary" &&
          u.classType !== "Sentinel",
      );
      for (const contested of contestedByEnemy) {
        let interceptorsAssigned = 0;
        for (const bot of nonHealerNonSentinel) {
          if (!assignments.has(bot.id) && interceptorsAssigned < 2) {
            assignments.set(bot.id, {
              unitId: bot.id,
              role: "intercept",
              targetTerritoryId: contested.id,
            });
            interceptorsAssigned++;
          }
        }
      }
    }

    // 5. Capture roles for Colonizers
    if (team === "Colonizers") {
      const captureBots = botUnits.filter(
        (u) =>
          !assignments.has(u.id) &&
          u.classType !== "Engineer" &&
          u.classType !== "Missionary",
      );
      for (const bot of captureBots) {
        const availablePoint = uncontestedPoints.find(
          (t) => !assignedCaptureTargets.has(t.id),
        );
        if (availablePoint) {
          assignments.set(bot.id, {
            unitId: bot.id,
            role: "capture",
            targetTerritoryId: availablePoint.id,
          });
          assignedCaptureTargets.add(availablePoint.id);
        } else if (uncontestedPoints.length > 0) {
          const target = nearestOf(
            uncontestedPoints,
            (t) => t.center,
            bot.position,
          );
          if (target) {
            assignments.set(bot.id, {
              unitId: bot.id,
              role: "capture",
              targetTerritoryId: target.id,
            });
          }
        }
      }
    }

    // 6. Remaining unassigned bots get default roles
    for (const bot of botUnits) {
      if (!assignments.has(bot.id)) {
        const role: BotRole = team === "NativePeoples" ? "defend" : "capture";
        assignments.set(bot.id, { unitId: bot.id, role });
      }
    }
  }

  return {
    team,
    uncontestedPoints,
    contestedByEnemy,
    criticallyWounded,
    woundedAllies,
    enemyConstructions,
    highValueEnemies,
    assignments,
    assignedCaptureTargets,
    assignedHealTargets,
    hasHumanOnTeam,
    humanUnit,
    protectedTerritoryIds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function selectTalentPathForBot(
  classType: ClassType,
): "PathA" | "PathB" {
  const defensiveClasses: ClassType[] = ["Sentinel", "Missionary", "Shaman"];
  const offensiveClasses: ClassType[] = [
    "ForestWarrior",
    "MusketSoldier",
    "SpiritHunter",
  ];
  if (defensiveClasses.includes(classType)) return "PathA";
  if (offensiveClasses.includes(classType)) return "PathB";
  return "PathA";
}

export function getBotAction(
  unit: GameUnit,
  state: GameState,
  teamContext?: TeamContext,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  const enemies = getEnemyUnits(state, unit.team);
  const allies = getAllyUnits(state, unit.team, unit.id);
  const currentTerritory = getTerritoryAtPosition(
    state.territories,
    unit.position,
  );
  const ctx = teamContext ?? null;

  // ── Teammate bot: use role-based AI ──────────────────────────────────────
  if (ctx?.hasHumanOnTeam) {
    return getTeammateBotAction(unit, state, enemies, allies, ctx);
  }

  // ── Enemy bot: class-specific AI ─────────────────────────────────────────
  switch (unit.classType) {
    case "Engineer":
      return getEngineerAction(unit, state, enemies, ctx);
    case "Sentinel":
      return getSentinelAction(unit, state, enemies, ctx);
    case "Shaman":
    case "Missionary":
      return getHealerAction(unit, state, allies, enemies, ctx);
    case "Captain":
      return getCaptainAction(unit, state, allies, enemies, ctx);
    case "ForestWarrior":
      return getForestWarriorAction(
        unit,
        state,
        enemies,
        currentTerritory,
        ctx,
      );
    case "MusketSoldier":
      return getMusketSoldierAction(
        unit,
        state,
        enemies,
        currentTerritory,
        ctx,
      );
    case "SpiritHunter":
      return getSpiritHunterAction(unit, state, enemies, ctx);
    default:
      return getDefaultAction(unit, state, enemies, ctx);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Teammate bot role-based action handler
// ─────────────────────────────────────────────────────────────────────────────

function getTeammateBotAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  allies: GameUnit[],
  ctx: TeamContext,
): BotAction {
  const assignment = ctx.assignments.get(unit.id);
  const role: BotRole = assignment?.role ?? "follow_support";

  // Always attack opportunistically if enemy is in range and hasn't acted
  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  if (role === "follow_support") {
    // Healers: heal wounded allies first
    const isHealer =
      unit.classType === "Shaman" || unit.classType === "Missionary";
    if (isHealer && !unit.hasActed) {
      const woundedAlly = allies
        .filter((f) => f.health < f.maxHealth * 0.7)
        .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
      if (woundedAlly) {
        if (
          getDistance(unit.position, woundedAlly.position) <= unit.attackRange
        ) {
          const healAbility = unit.abilities.find(
            (a) =>
              (a.id === "heal" || a.id === "heal_ally") &&
              a.currentCooldown === 0,
          );
          if (healAbility) {
            return {
              type: "ability",
              abilityId: healAbility.id,
              targetUnitId: woundedAlly.id,
            };
          }
        }
        if (!unit.hasMoved) {
          return moveToward(unit, woundedAlly.position, unit.attackRange * 0.8);
        }
      }
    }

    // Follow the human player's unit
    const targetUnit = assignment?.targetUnitId
      ? state.units.find((u) => u.id === assignment.targetUnitId)
      : ctx.humanUnit;

    if (targetUnit && !unit.hasMoved) {
      const dist = getDistance(unit.position, targetUnit.position);
      if (dist > unit.movementRange * 1.5) {
        return moveToward(unit, targetUnit.position, unit.movementRange * 0.5);
      }
    }

    // Move toward nearest enemy if no human to follow
    if (!unit.hasMoved && enemies.length > 0) {
      const nearest = nearestOf(enemies, (e) => e.position, unit.position);
      if (nearest)
        return moveToward(unit, nearest.position, unit.attackRange * 0.8);
    }

    return { type: "endTurn" };
  }

  if (role === "dominate") {
    const targetTerritoryId = assignment?.targetTerritoryId;
    const targetTerritory = targetTerritoryId
      ? state.territories.find((t) => t.id === targetTerritoryId)
      : nearestOf(
          state.territories.filter(
            (t) => t.owner !== unit.team && t.isStrategicPoint,
          ),
          (t) => t.center,
          unit.position,
        );

    if (targetTerritory && !unit.hasMoved) {
      const dist = getDistance(unit.position, targetTerritory.center);
      if (dist > 30) {
        return moveToward(unit, targetTerritory.center, 20);
      }
    }

    // Attack nearest enemy if no territory to dominate
    if (!unit.hasMoved && enemies.length > 0) {
      const nearest = nearestOf(enemies, (e) => e.position, unit.position);
      if (nearest)
        return moveToward(unit, nearest.position, unit.attackRange * 0.8);
    }

    return { type: "endTurn" };
  }

  if (role === "protect") {
    const targetTerritoryId = assignment?.targetTerritoryId;
    const targetTerritory = targetTerritoryId
      ? state.territories.find((t) => t.id === targetTerritoryId)
      : nearestOf(
          state.territories.filter(
            (t) => t.owner === unit.team && t.isStrategicPoint,
          ),
          (t) => t.center,
          unit.position,
        );

    if (targetTerritory) {
      // Attack any enemy near the protected territory
      const nearbyEnemy = enemies
        .filter((e) => getDistance(e.position, targetTerritory.center) <= 200)
        .sort(
          (a, b) =>
            getDistance(unit.position, a.position) -
            getDistance(unit.position, b.position),
        )[0];

      if (nearbyEnemy && !unit.hasActed) {
        if (
          getDistance(unit.position, nearbyEnemy.position) <= unit.attackRange
        ) {
          return { type: "attack", targetUnitId: nearbyEnemy.id };
        }
        if (!unit.hasMoved) {
          return moveToward(unit, nearbyEnemy.position, unit.attackRange * 0.8);
        }
      }

      // Move to the protected territory if not already there
      if (!unit.hasMoved) {
        const dist = getDistance(unit.position, targetTerritory.center);
        if (dist > 40) {
          return moveToward(unit, targetTerritory.center, 30);
        }
      }
    }

    return { type: "endTurn" };
  }

  return { type: "endTurn" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Class-specific action handlers (enemy bots)
// ─────────────────────────────────────────────────────────────────────────────

function getEngineerAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  const currentTerritory = getTerritoryAtPosition(
    state.territories,
    unit.position,
  );

  if (
    !unit.hasActed &&
    currentTerritory?.isBuildable &&
    !currentTerritory.construction
  ) {
    const buildType =
      currentTerritory.terrain === "fort" ? "fortress" : "tower";
    return { type: "build", buildType };
  }

  if (!unit.hasMoved) {
    const fortTerritories = getFortTerritories(state).filter(
      (t) => t.isBuildable && !t.construction && t.owner === unit.team,
    );
    const buildable = getBuildableTerritories(state);

    const targetTerritory =
      fortTerritories.length > 0
        ? nearestOf(fortTerritories, (t) => t.center, unit.position)
        : ctx?.assignments.get(unit.id)?.targetTerritoryId
          ? (state.territories.find(
              (t) => t.id === ctx!.assignments.get(unit.id)!.targetTerritoryId,
            ) ?? null)
          : nearestOf(buildable, (t) => t.center, unit.position);

    if (targetTerritory) {
      const dist = getDistance(unit.position, targetTerritory.center);
      if (dist > 30) {
        return moveToward(unit, targetTerritory.center, 20);
      }
    }
  }

  const tooClose = enemies.find(
    (e) => getDistance(unit.position, e.position) < 100,
  );
  if (!unit.hasMoved && tooClose) {
    return moveAwayFrom(unit, tooClose.position);
  }

  return { type: "endTurn" };
}

function getSentinelAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  const enemyConstructions =
    ctx?.enemyConstructions ??
    getEnemyConstructionTerritories(state, unit.team);

  if (!unit.hasActed && enemyConstructions.length > 0) {
    const nearest = nearestOf(
      enemyConstructions,
      (t) => t.center,
      unit.position,
    );
    if (
      nearest &&
      getDistance(unit.position, nearest.center) <= unit.attackRange
    ) {
      const destroyAbility = unit.abilities.find((a) => a.id === "destroy");
      if (destroyAbility && destroyAbility.currentCooldown === 0) {
        return { type: "destroy", targetPosition: nearest.center };
      }
    }
  }

  if (!unit.hasMoved && enemyConstructions.length > 0) {
    const nearest = nearestOf(
      enemyConstructions,
      (t) => t.center,
      unit.position,
    );
    if (nearest) {
      const dist = getDistance(unit.position, nearest.center);
      if (dist > unit.attackRange * 0.8) {
        return moveToward(unit, nearest.center, unit.attackRange * 0.6);
      }
    }
  }

  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  if (!unit.hasActed) {
    const barricade = unit.abilities.find((a) => a.id === "barricade");
    if (barricade && barricade.currentCooldown === 0) {
      const nearbyEnemies = enemies.filter(
        (e) => getDistance(unit.position, e.position) < 200,
      );
      if (nearbyEnemies.length >= 2) {
        return { type: "ability", abilityId: "barricade" };
      }
    }
  }

  if (!unit.hasMoved && enemies.length > 0) {
    const nearest = nearestOf(enemies, (e) => e.position, unit.position);
    if (nearest)
      return moveToward(unit, nearest.position, unit.attackRange * 0.7);
  }

  return { type: "endTurn" };
}

function getHealerAction(
  unit: GameUnit,
  _state: GameState,
  allies: GameUnit[],
  enemies: GameUnit[],
  ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  const woundedAllies =
    ctx?.woundedAllies ?? allies.filter((a) => a.health < a.maxHealth * 0.6);

  if (!unit.hasActed && woundedAllies.length > 0) {
    const target = woundedAllies
      .filter((a) => a.id !== unit.id)
      .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];

    if (target) {
      const healAbilityId = unit.classType === "Shaman" ? "heal" : "heal_ally";
      const healAbility = unit.abilities.find((a) => a.id === healAbilityId);

      if (healAbility && healAbility.currentCooldown === 0) {
        if (getDistance(unit.position, target.position) <= unit.attackRange) {
          return {
            type: "ability",
            abilityId: healAbilityId,
            targetUnitId: target.id,
          };
        }
        if (!unit.hasMoved) {
          return moveToward(unit, target.position, unit.attackRange * 0.8);
        }
      }
    }
  }

  if (!unit.hasActed && enemies.length > 0) {
    const debuffAbilityId = unit.classType === "Shaman" ? "weaken" : "pacify";
    const debuffAbility = unit.abilities.find((a) => a.id === debuffAbilityId);
    if (debuffAbility && debuffAbility.currentCooldown === 0) {
      const target = enemies.find(
        (e) => getDistance(unit.position, e.position) <= unit.attackRange,
      );
      if (target) {
        return {
          type: "ability",
          abilityId: debuffAbilityId,
          targetUnitId: target.id,
        };
      }
    }
  }

  const tooClose = enemies.find(
    (e) => getDistance(unit.position, e.position) < 120,
  );
  if (!unit.hasMoved && tooClose) {
    return moveAwayFrom(unit, tooClose.position);
  }

  if (!unit.hasMoved && allies.length > 0) {
    const centroid = allies.reduce(
      (acc, a) => ({ x: acc.x + a.position.x, y: acc.y + a.position.y }),
      { x: 0, y: 0 },
    );
    const avgPos = {
      x: centroid.x / allies.length,
      y: centroid.y / allies.length,
    };
    if (getDistance(unit.position, avgPos) > 100) {
      return moveToward(unit, avgPos, 50);
    }
  }

  return { type: "endTurn" };
}

function getCaptainAction(
  unit: GameUnit,
  _state: GameState,
  allies: GameUnit[],
  enemies: GameUnit[],
  _ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  if (!unit.hasActed) {
    const formationBuff = unit.abilities.find((a) => a.id === "formation_buff");
    if (formationBuff && formationBuff.currentCooldown === 0) {
      const nearbyAllies = allies.filter(
        (a) => getDistance(unit.position, a.position) < 150,
      );
      if (nearbyAllies.length >= 2) {
        return { type: "ability", abilityId: "formation_buff" };
      }
    }

    const rally = unit.abilities.find((a) => a.id === "rally");
    if (rally && rally.currentCooldown === 0) {
      const woundedNearby = allies.filter(
        (a) =>
          a.health < a.maxHealth * 0.5 &&
          getDistance(unit.position, a.position) < 150,
      );
      if (woundedNearby.length >= 1) {
        return { type: "ability", abilityId: "rally" };
      }
    }
  }

  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  if (!unit.hasMoved) {
    const centroid = allies.reduce(
      (acc, a) => ({ x: acc.x + a.position.x, y: acc.y + a.position.y }),
      { x: unit.position.x, y: unit.position.y },
    );
    const avgPos = {
      x: centroid.x / (allies.length + 1),
      y: centroid.y / (allies.length + 1),
    };
    if (getDistance(unit.position, avgPos) > 80) {
      return moveToward(unit, avgPos, 50);
    }

    if (enemies.length > 0) {
      const nearest = nearestOf(enemies, (e) => e.position, unit.position);
      if (nearest)
        return moveToward(unit, nearest.position, unit.attackRange * 0.7);
    }
  }

  return { type: "endTurn" };
}

function getForestWarriorAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  currentTerritory: ReturnType<typeof getTerritoryAtPosition>,
  _ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      if (currentTerritory?.terrain === "forest") {
        return { type: "attack", targetUnitId: attackable.id };
      }
    }
  }

  if (!unit.hasActed) {
    const camouflage = unit.abilities.find((a) => a.id === "camouflage");
    if (camouflage && camouflage.currentCooldown === 0 && !unit.isInvisible) {
      const nearbyEnemies = enemies.filter(
        (e) => getDistance(unit.position, e.position) < 200,
      );
      if (nearbyEnemies.length >= 2) {
        return { type: "ability", abilityId: "camouflage" };
      }
    }
  }

  if (!unit.hasMoved) {
    if (currentTerritory?.terrain !== "forest") {
      const forestTerritories = getForestTerritories(state);
      const nearestForest = nearestOf(
        forestTerritories,
        (t) => t.center,
        unit.position,
      );
      if (nearestForest) {
        return moveToward(unit, nearestForest.center, 20);
      }
    }

    if (enemies.length > 0) {
      const nearest = nearestOf(enemies, (e) => e.position, unit.position);
      if (nearest)
        return moveToward(unit, nearest.position, unit.attackRange * 0.7);
    }
  }

  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  return { type: "endTurn" };
}

function getMusketSoldierAction(
  unit: GameUnit,
  _state: GameState,
  enemies: GameUnit[],
  _currentTerritory: ReturnType<typeof getTerritoryAtPosition>,
  ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  if (!unit.hasActed && !unit.isReloading) {
    const musketFire = unit.abilities.find((a) => a.id === "musket_fire");
    if (musketFire && musketFire.currentCooldown === 0 && enemies.length > 0) {
      const target =
        ctx?.highValueEnemies.find(
          (e) => getDistance(unit.position, e.position) <= unit.attackRange,
        ) ??
        enemies.find(
          (e) => getDistance(unit.position, e.position) <= unit.attackRange,
        );
      if (target) {
        return {
          type: "ability",
          abilityId: "musket_fire",
          targetUnitId: target.id,
        };
      }
    }
  }

  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  if (!unit.hasMoved && enemies.length > 0) {
    const nearest = nearestOf(enemies, (e) => e.position, unit.position);
    if (nearest) {
      const dist = getDistance(unit.position, nearest.position);
      if (dist < unit.attackRange * 0.5) {
        return moveAwayFrom(unit, nearest.position);
      }
      if (dist > unit.attackRange * 1.2) {
        return moveToward(unit, nearest.position, unit.attackRange * 0.8);
      }
    }
  }

  return { type: "endTurn" };
}

function getSpiritHunterAction(
  unit: GameUnit,
  _state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  const highValueTargets = ctx?.highValueEnemies ?? [];

  if (!unit.hasActed) {
    const markAbility = unit.abilities.find((a) => a.id === "mark_enemy");
    if (
      markAbility &&
      markAbility.currentCooldown === 0 &&
      highValueTargets.length > 0
    ) {
      const target = highValueTargets.find(
        (e) => getDistance(unit.position, e.position) <= unit.attackRange * 1.5,
      );
      if (target) {
        return {
          type: "ability",
          abilityId: "mark_enemy",
          targetUnitId: target.id,
        };
      }
    }
  }

  if (!unit.hasActed && enemies.length > 0) {
    const markedTarget = unit.markedEnemyId
      ? enemies.find(
          (e) =>
            e.id === unit.markedEnemyId &&
            getDistance(unit.position, e.position) <= unit.attackRange,
        )
      : null;
    if (markedTarget) {
      return { type: "attack", targetUnitId: markedTarget.id };
    }

    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  if (!unit.hasMoved && enemies.length > 0) {
    const target =
      highValueTargets.length > 0
        ? nearestOf(highValueTargets, (e) => e.position, unit.position)
        : nearestOf(enemies, (e) => e.position, unit.position);
    if (target)
      return moveToward(unit, target.position, unit.attackRange * 0.7);
  }

  return { type: "endTurn" };
}

function getDefaultAction(
  unit: GameUnit,
  state: GameState,
  enemies: GameUnit[],
  ctx: TeamContext | null,
): BotAction {
  if (unit.hasMoved && unit.hasActed) return { type: "endTurn" };

  if (!unit.hasActed && enemies.length > 0) {
    const attackable = enemies.find(
      (e) => getDistance(unit.position, e.position) <= unit.attackRange,
    );
    if (attackable) {
      return { type: "attack", targetUnitId: attackable.id };
    }
  }

  const assignment = ctx?.assignments.get(unit.id);
  if (assignment?.role === "capture" || assignment?.role === "intercept") {
    const targetTerritoryId = assignment.targetTerritoryId;
    const targetTerritory = targetTerritoryId
      ? state.territories.find((t) => t.id === targetTerritoryId)
      : null;

    if (targetTerritory && !unit.hasMoved) {
      const dist = getDistance(unit.position, targetTerritory.center);
      if (dist > 30) {
        return moveToward(unit, targetTerritory.center, 20);
      }
    }
  }

  if (!unit.hasMoved && enemies.length > 0) {
    const nearest = nearestOf(enemies, (e) => e.position, unit.position);
    if (nearest)
      return moveToward(unit, nearest.position, unit.attackRange * 0.7);
  }

  return { type: "endTurn" };
}
