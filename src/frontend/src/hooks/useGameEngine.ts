import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Construction,
  GameState,
  GameUnit,
  TalentPath,
  Team,
  Territory,
} from "../types/game";
import { CONQUEST_HOLD_DURATION, XP_THRESHOLDS } from "../types/game";
import type { PlayerSlot } from "../types/game";
import {
  computeTeamContext,
  getBotAction,
  selectTalentPathForBot,
} from "../utils/botAI";
import {
  TALENT_PATHS,
  XP_GAINS,
  getDistance,
  getTerritoryAtPosition,
  initializeGameState,
  isPointInPolygon,
} from "../utils/gameInitializer";
import {
  checkColonizerStrategicControl,
  checkWinCondition,
} from "../utils/winConditions";

export interface ActionFeedback {
  message: string;
  type: "info" | "success" | "warning" | "error";
}

export interface UseGameEngineReturn {
  gameState: GameState;
  selectedUnit: GameUnit | null;
  actionFeedback: ActionFeedback | null;
  // Highlighted tiles for simplified controls
  reachablePositions: { x: number; y: number }[];
  attackableUnitIds: string[];
  handleCanvasClick: (x: number, y: number) => void;
  endTurn: () => void;
  deselectUnit: () => void;
  executeAbility: (
    unitId: string,
    abilityId: string,
    targetId?: string,
  ) => void;
  buildConstruction: (unitId: string, buildType: "tower" | "fortress") => void;
  destroyConstruction: (unitId: string) => void;
  applyTalentPath: (unitId: string, path: TalentPath) => void;
  isGameOver: boolean;
  players: PlayerSlot[];
}

export function useGameEngine(players: PlayerSlot[]): UseGameEngineReturn {
  const [gameState, setGameState] = useState<GameState>(() =>
    initializeGameState(players),
  );
  const [selectedUnit, setSelectedUnit] = useState<GameUnit | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(
    null,
  );
  // Simplified controls: precomputed highlights
  const [reachablePositions, setReachablePositions] = useState<
    { x: number; y: number }[]
  >([]);
  const [attackableUnitIds, setAttackableUnitIds] = useState<string[]>([]);

  const gameStateRef = useRef<GameState>(gameState);
  const selectedUnitRef = useRef<GameUnit | null>(selectedUnit);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    selectedUnitRef.current = selectedUnit;
  }, [selectedUnit]);

  const showFeedback = useCallback(
    (msg: string, type: ActionFeedback["type"] = "info") => {
      setActionFeedback({ message: msg, type });
      setTimeout(() => setActionFeedback(null), 2500);
    },
    [],
  );

  // ── Compute highlights when selected unit changes ─────────────────────────
  const computeHighlights = useCallback(
    (unit: GameUnit | null, state: GameState) => {
      if (!unit) {
        setReachablePositions([]);
        setAttackableUnitIds([]);
        return;
      }

      // Reachable positions: circle around unit within movementRange
      const reachable: { x: number; y: number }[] = [];
      if (!unit.hasMoved) {
        // Sample positions in a grid within movement range
        const step = 20;
        const range = unit.movementRange;
        for (let dx = -range; dx <= range; dx += step) {
          for (let dy = -range; dy <= range; dy += step) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > range || dist < step * 0.5) continue;
            const pos = { x: unit.position.x + dx, y: unit.position.y + dy };
            if (pos.x < 20 || pos.x > 1180 || pos.y < 20 || pos.y > 780)
              continue;
            // Check not occupied by another unit
            const occupied = state.units.find(
              (u) =>
                u.id !== unit.id &&
                u.health > 0 &&
                getDistance(u.position, pos) < 15,
            );
            if (!occupied) reachable.push(pos);
          }
        }
      }
      setReachablePositions(reachable);

      // Attackable unit IDs: enemies within attack range
      const attackable = unit.hasActed
        ? []
        : state.units
            .filter(
              (u) =>
                u.team !== unit.team &&
                u.health > 0 &&
                !u.isInvisible &&
                getDistance(unit.position, u.position) <= unit.attackRange,
            )
            .map((u) => u.id);
      setAttackableUnitIds(attackable);
    },
    [],
  );

  // Timer
  useEffect(() => {
    if (gameState.gameOver) return;
    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (prev.gameOver) return prev;

        let newConquestCountdown = prev.conquestCountdown;
        const colonizersHoldAll = checkColonizerStrategicControl(prev);

        if (colonizersHoldAll) {
          if (newConquestCountdown === null) {
            newConquestCountdown = CONQUEST_HOLD_DURATION;
          } else {
            newConquestCountdown = Math.max(0, newConquestCountdown - 1);
          }
        } else {
          newConquestCountdown = null;
        }

        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
        const newState = {
          ...prev,
          timeRemaining: newTimeRemaining,
          conquestCountdown: newConquestCountdown,
        };
        const winner = checkWinCondition(newState);
        if (winner) {
          return { ...newState, gameOver: true, winner };
        }
        return newState;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.gameOver]);

  // Flash timer update
  useEffect(() => {
    const flashInterval = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({
          ...u,
          flashTimer: u.flashTimer > 0 ? u.flashTimer - 1 : 0,
        })),
      }));
    }, 100);
    return () => clearInterval(flashInterval);
  }, []);

  const grantXP = useCallback(
    (unitId: string, amount: number, state: GameState): GameState => {
      const unitIndex = state.units.findIndex((u) => u.id === unitId);
      if (unitIndex === -1) return state;

      const unit = state.units[unitIndex];
      const newXP = unit.xp + amount;
      let newLevel = unit.level;
      let pendingTalentSelections = [...state.pendingTalentSelections];

      if (unit.level === 1 && newXP >= XP_THRESHOLDS[1]) {
        newLevel = 2;
        if (!unit.isBot && !pendingTalentSelections.includes(unitId)) {
          pendingTalentSelections = [...pendingTalentSelections, unitId];
        }
      } else if (unit.level === 2 && newXP >= XP_THRESHOLDS[2]) {
        newLevel = 3;
      }

      const updatedUnit = { ...unit, xp: newXP, level: newLevel };
      const newUnits = [...state.units];
      newUnits[unitIndex] = updatedUnit;
      return { ...state, units: newUnits, pendingTalentSelections };
    },
    [],
  );

  const applyTalentPath = useCallback((unitId: string, path: TalentPath) => {
    setGameState((prev) => {
      const unitIndex = prev.units.findIndex((u) => u.id === unitId);
      if (unitIndex === -1) return prev;

      const unit = prev.units[unitIndex];
      const talentData = TALENT_PATHS[unit.classType][path];
      const bonuses = talentData.statBonuses;

      const updatedUnit: GameUnit = {
        ...unit,
        talentPath: path,
        health: unit.health + (bonuses.health || 0),
        maxHealth: unit.maxHealth + (bonuses.health || 0),
        attack: unit.attack + (bonuses.attack || 0),
        defense: unit.defense + (bonuses.defense || 0),
        movementRange: unit.movementRange + (bonuses.movement || 0),
        attackRange: unit.attackRange + (bonuses.attackRange || 0),
      };

      const newUnits = [...prev.units];
      newUnits[unitIndex] = updatedUnit;
      const pendingTalentSelections = prev.pendingTalentSelections.filter(
        (id) => id !== unitId,
      );
      return { ...prev, units: newUnits, pendingTalentSelections };
    });
  }, []);

  function autoApplyBotTalents(state: GameState): GameState {
    let newState = state;
    for (const unit of state.units) {
      if (unit.isBot && unit.level === 2 && unit.talentPath === null) {
        const path = selectTalentPathForBot(unit.classType);
        const unitIndex = newState.units.findIndex((u) => u.id === unit.id);
        if (unitIndex !== -1) {
          const talentData = TALENT_PATHS[unit.classType][path];
          const bonuses = talentData.statBonuses;
          const u = newState.units[unitIndex];
          const updatedUnit: GameUnit = {
            ...u,
            talentPath: path,
            health: u.health + (bonuses.health || 0),
            maxHealth: u.maxHealth + (bonuses.health || 0),
            attack: u.attack + (bonuses.attack || 0),
            defense: u.defense + (bonuses.defense || 0),
            movementRange: u.movementRange + (bonuses.movement || 0),
            attackRange: u.attackRange + (bonuses.attackRange || 0),
          };
          const newUnits = [...newState.units];
          newUnits[unitIndex] = updatedUnit;
          newState = { ...newState, units: newUnits };
        }
      }
    }
    return newState;
  }

  function updateTerritoryCapture(state: GameState): Territory[] {
    return state.territories.map((territory) => {
      const unitsOnTerritory = state.units.filter(
        (u) => u.health > 0 && isPointInPolygon(u.position, territory.vertices),
      );
      const nativeUnits = unitsOnTerritory.filter(
        (u) => u.team === "NativePeoples",
      );
      const colonizerUnits = unitsOnTerritory.filter(
        (u) => u.team === "Colonizers",
      );

      if (nativeUnits.length > 0 && colonizerUnits.length === 0) {
        const delta = territory.capturingTeam === "NativePeoples" ? 10 : -10;
        const newProgress = Math.max(
          0,
          Math.min(100, territory.captureProgress + delta),
        );
        const newOwner: Team | null =
          newProgress >= 100
            ? "NativePeoples"
            : newProgress <= 0
              ? null
              : territory.owner;
        return {
          ...territory,
          captureProgress: newProgress,
          capturingTeam: "NativePeoples" as Team,
          owner: newOwner,
        };
      }
      if (colonizerUnits.length > 0 && nativeUnits.length === 0) {
        const delta = territory.capturingTeam === "Colonizers" ? 10 : -10;
        const newProgress = Math.max(
          0,
          Math.min(100, territory.captureProgress + delta),
        );
        const newOwner: Team | null =
          newProgress >= 100
            ? "Colonizers"
            : newProgress <= 0
              ? null
              : territory.owner;
        return {
          ...territory,
          captureProgress: newProgress,
          capturingTeam: "Colonizers" as Team,
          owner: newOwner,
        };
      }
      return territory;
    });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: autoApplyBotTalents is a stable inner function
  const performAttack = useCallback(
    (attacker: GameUnit, targetId: string, state: GameState): GameState => {
      const target = state.units.find((u) => u.id === targetId);
      if (!target) return state;

      const dist = getDistance(attacker.position, target.position);
      if (dist > attacker.attackRange) return state;

      let damage = attacker.attack;

      const attackerTerritory = getTerritoryAtPosition(
        state.territories,
        attacker.position,
      );
      if (
        attacker.classType === "ForestWarrior" &&
        attackerTerritory?.terrain === "forest"
      )
        damage *= 1.15;
      if (
        attacker.classType === "MusketSoldier" &&
        attackerTerritory?.terrain === "plains"
      )
        damage *= 1.1;
      if (attackerTerritory?.isElevated) damage *= 1.1;
      if (attacker.markedEnemyId === targetId) damage *= 1.25;
      if (attacker.attackDebuffTurns > 0) damage *= 0.7;

      const targetTerritory = getTerritoryAtPosition(
        state.territories,
        target.position,
      );
      if (
        targetTerritory?.construction?.type === "fortress" &&
        targetTerritory.construction.owner === target.team
      ) {
        damage *= 0.75;
      }

      damage = Math.max(1, Math.round(damage - target.defense * 0.3));
      const newTargetHealth = Math.max(0, target.health - damage);
      const isKill = newTargetHealth <= 0;

      let newUnits = state.units.map((u) => {
        if (u.id === targetId)
          return { ...u, health: newTargetHealth, flashTimer: 5 };
        if (u.id === attacker.id) return { ...u, hasActed: true };
        return u;
      });

      let newState = { ...state, units: newUnits };

      if (isKill) {
        newState = grantXP(attacker.id, XP_GAINS.ELIMINATE_ENEMY, newState);
        const nearbyAllies = state.units.filter(
          (u) =>
            u.team === attacker.team &&
            u.id !== attacker.id &&
            getDistance(u.position, attacker.position) < 200,
        );
        for (const ally of nearbyAllies) {
          newState = grantXP(ally.id, XP_GAINS.ASSIST_KILL, newState);
        }
      }

      newState = autoApplyBotTalents(newState);
      return newState;
    },
    [grantXP],
  );

  const executeAbility = useCallback(
    (unitId: string, abilityId: string, targetId?: string) => {
      setGameState((prev) => {
        const unitIndex = prev.units.findIndex((u) => u.id === unitId);
        if (unitIndex === -1) return prev;

        const unit = prev.units[unitIndex];
        const abilityIndex = unit.abilities.findIndex(
          (a) => a.id === abilityId,
        );
        if (abilityIndex === -1) return prev;

        const ability = unit.abilities[abilityIndex];
        if (ability.currentCooldown > 0) return prev;

        let newUnits = [...prev.units];
        const updatedAbilities = unit.abilities.map((a, i) =>
          i === abilityIndex ? { ...a, currentCooldown: a.cooldown } : a,
        );

        switch (abilityId) {
          case "camouflage": {
            newUnits[unitIndex] = {
              ...unit,
              abilities: updatedAbilities,
              isInvisible: true,
              invisibilityTurns: 2,
              hasActed: true,
            };
            showFeedback("Camuflagem ativada!", "success");
            break;
          }
          case "mark_enemy": {
            if (targetId) {
              newUnits[unitIndex] = {
                ...unit,
                abilities: updatedAbilities,
                markedEnemyId: targetId,
                hasActed: true,
              };
              showFeedback("Inimigo marcado!", "success");
            }
            break;
          }
          case "heal":
          case "heal_ally": {
            if (targetId) {
              const targetIndex = newUnits.findIndex((u) => u.id === targetId);
              if (targetIndex !== -1) {
                const tgt = newUnits[targetIndex];
                const healAmount = Math.round(tgt.maxHealth * 0.3);
                newUnits[targetIndex] = {
                  ...tgt,
                  health: Math.min(tgt.maxHealth, tgt.health + healAmount),
                };
                newUnits[unitIndex] = {
                  ...unit,
                  abilities: updatedAbilities,
                  hasActed: true,
                };
                showFeedback(`Curou ${healAmount} HP!`, "success");
              }
            }
            break;
          }
          case "weaken":
          case "pacify": {
            if (targetId) {
              const targetIndex = newUnits.findIndex((u) => u.id === targetId);
              if (targetIndex !== -1) {
                newUnits[targetIndex] = {
                  ...newUnits[targetIndex],
                  attackDebuffTurns: 2,
                };
                newUnits[unitIndex] = {
                  ...unit,
                  abilities: updatedAbilities,
                  hasActed: true,
                };
                showFeedback("Inimigo enfraquecido!", "success");
              }
            }
            break;
          }
          case "formation_buff": {
            const nearbyAllies = newUnits.filter(
              (u) =>
                u.team === unit.team &&
                u.id !== unitId &&
                getDistance(u.position, unit.position) < 150,
            );
            newUnits = newUnits.map((u) => {
              if (nearbyAllies.find((a) => a.id === u.id))
                return { ...u, attackBuffTurns: 2 };
              return u;
            });
            newUnits[unitIndex] = {
              ...unit,
              abilities: updatedAbilities,
              hasActed: true,
            };
            showFeedback(
              `Formação! ${nearbyAllies.length} aliados buffados`,
              "success",
            );
            break;
          }
          case "rally": {
            const nearbyAllies = newUnits.filter(
              (u) =>
                u.team === unit.team &&
                u.id !== unitId &&
                getDistance(u.position, unit.position) < 150,
            );
            newUnits = newUnits.map((u) => {
              if (nearbyAllies.find((a) => a.id === u.id)) {
                const healAmount = Math.round(u.maxHealth * 0.15);
                return {
                  ...u,
                  health: Math.min(u.maxHealth, u.health + healAmount),
                };
              }
              return u;
            });
            newUnits[unitIndex] = {
              ...unit,
              abilities: updatedAbilities,
              hasActed: true,
            };
            showFeedback("Reagrupamento!", "success");
            break;
          }
          case "musket_fire": {
            if (targetId) {
              const targetIndex = newUnits.findIndex((u) => u.id === targetId);
              if (targetIndex !== -1) {
                const dmg = Math.round(unit.attack * 1.8);
                const newHealth = Math.max(
                  0,
                  newUnits[targetIndex].health - dmg,
                );
                newUnits[targetIndex] = {
                  ...newUnits[targetIndex],
                  health: newHealth,
                  flashTimer: 5,
                };
                newUnits[unitIndex] = {
                  ...unit,
                  abilities: updatedAbilities,
                  hasActed: true,
                  isReloading: true,
                };
                showFeedback(`Disparo! ${dmg} dano`, "success");
              }
            }
            break;
          }
          case "barricade": {
            newUnits[unitIndex] = {
              ...unit,
              abilities: updatedAbilities,
              hasActed: true,
            };
            showFeedback("Barricada construída!", "success");
            break;
          }
          case "destroy": {
            const nearbyEnemyConstruction = prev.territories.find(
              (t) =>
                t.construction &&
                t.construction.owner !== unit.team &&
                getDistance(unit.position, t.center) < unit.attackRange,
            );
            if (nearbyEnemyConstruction?.construction) {
              newUnits[unitIndex] = {
                ...unit,
                abilities: updatedAbilities,
                hasActed: true,
                isDestroying: nearbyEnemyConstruction.construction.id,
              };
              showFeedback("Destruindo construção inimiga!", "success");
            }
            break;
          }
          default:
            newUnits[unitIndex] = {
              ...unit,
              abilities: updatedAbilities,
              hasActed: true,
            };
        }

        return { ...prev, units: newUnits };
      });
    },
    [showFeedback],
  );

  const buildConstruction = useCallback(
    (unitId: string, buildType: "tower" | "fortress") => {
      setGameState((prev) => {
        const unit = prev.units.find((u) => u.id === unitId);
        if (!unit) return prev;

        const territory = getTerritoryAtPosition(
          prev.territories,
          unit.position,
        );
        if (!territory?.isBuildable || territory.construction) return prev;

        const newConstruction: Construction = {
          id: `construction_${Date.now()}`,
          type: buildType,
          owner: unit.team,
          territoryId: territory.id,
          health: buildType === "tower" ? 50 : 100,
          maxHealth: buildType === "tower" ? 50 : 100,
          constructionProgress: 100,
        };

        const newTerritories = prev.territories.map((t) =>
          t.id === territory.id ? { ...t, construction: newConstruction } : t,
        );
        const newUnits = prev.units.map((u) =>
          u.id === unitId ? { ...u, hasActed: true } : u,
        );

        showFeedback(
          `${buildType === "tower" ? "Torre" : "Fortaleza"} construída!`,
          "success",
        );
        return {
          ...prev,
          territories: newTerritories,
          units: newUnits,
          constructions: [...prev.constructions, newConstruction],
        };
      });
    },
    [showFeedback],
  );

  const destroyConstruction = useCallback(
    (unitId: string) => {
      setGameState((prev) => {
        const unit = prev.units.find((u) => u.id === unitId);
        if (!unit) return prev;

        const nearbyEnemyTerritory = prev.territories.find(
          (t) =>
            t.construction &&
            t.construction.owner !== unit.team &&
            getDistance(unit.position, t.center) < unit.attackRange,
        );

        if (!nearbyEnemyTerritory?.construction) return prev;

        const newHealth = nearbyEnemyTerritory.construction.health - 50;
        let newTerritories: Territory[];

        if (newHealth <= 0) {
          newTerritories = prev.territories.map((t) =>
            t.id === nearbyEnemyTerritory.id ? { ...t, construction: null } : t,
          );
          showFeedback("Construção destruída!", "success");
        } else {
          newTerritories = prev.territories.map((t) =>
            t.id === nearbyEnemyTerritory.id
              ? {
                  ...t,
                  construction: { ...t.construction!, health: newHealth },
                }
              : t,
          );
          showFeedback("Construção danificada!", "info");
        }

        const newUnits = prev.units.map((u) =>
          u.id === unitId ? { ...u, hasActed: true } : u,
        );
        return { ...prev, territories: newTerritories, units: newUnits };
      });
    },
    [showFeedback],
  );

  // ── Simplified handleCanvasClick ──────────────────────────────────────────
  // One-click movement and one-click attack without mode switching
  // biome-ignore lint/correctness/useExhaustiveDependencies: updateTerritoryCapture is a stable inner function
  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      const state = gameStateRef.current;
      const currentSelected = selectedUnitRef.current;
      if (state.gameOver) return;

      const clickPos = { x, y };

      // Check if clicking on a friendly human-controlled unit
      const clickedFriendlyUnit = state.units.find((u) => {
        if (u.team !== state.currentTeam || u.health <= 0 || u.isBot)
          return false;
        return getDistance(u.position, clickPos) < 22;
      });

      if (clickedFriendlyUnit) {
        const isAlreadySelected =
          currentSelected?.id === clickedFriendlyUnit.id;
        if (isAlreadySelected) {
          // Deselect
          setSelectedUnit(null);
          setGameState((prev) => ({
            ...prev,
            units: prev.units.map((u) => ({ ...u, isSelected: false })),
          }));
          computeHighlights(null, state);
        } else {
          // Select new unit
          setSelectedUnit(clickedFriendlyUnit);
          setGameState((prev) => ({
            ...prev,
            units: prev.units.map((u) => ({
              ...u,
              isSelected: u.id === clickedFriendlyUnit.id,
            })),
          }));
          computeHighlights(clickedFriendlyUnit, state);
          showFeedback(`${clickedFriendlyUnit.classType} selecionado`, "info");
        }
        return;
      }

      if (!currentSelected) return;

      // Check if clicking on an enemy unit within attack range → DIRECT ATTACK
      const clickedEnemyUnit = state.units.find((u) => {
        if (u.team === state.currentTeam || u.health <= 0 || u.isInvisible)
          return false;
        return getDistance(u.position, clickPos) < 22;
      });

      if (clickedEnemyUnit) {
        if (currentSelected.hasActed) {
          showFeedback("Esta unidade já agiu neste turno!", "warning");
          return;
        }
        const dist = getDistance(
          currentSelected.position,
          clickedEnemyUnit.position,
        );
        if (dist <= currentSelected.attackRange) {
          // Perform attack directly
          setGameState((prev) => {
            const attacker = prev.units.find(
              (u) => u.id === currentSelected.id,
            );
            if (!attacker) return prev;
            const newState = performAttack(attacker, clickedEnemyUnit.id, prev);
            const updatedAttacker = newState.units.find(
              (u) => u.id === currentSelected.id,
            );
            // Update selected unit ref and highlights
            if (updatedAttacker) {
              setSelectedUnit(updatedAttacker);
              computeHighlights(updatedAttacker, newState);
            } else {
              setSelectedUnit(null);
              computeHighlights(null, newState);
            }
            return {
              ...newState,
              units: newState.units.map((u) => ({
                ...u,
                isSelected: u.id === currentSelected.id,
              })),
            };
          });
          showFeedback(`⚔️ Atacou ${clickedEnemyUnit.classType}!`, "success");
        } else {
          showFeedback(
            `Inimigo fora do alcance! (${Math.round(dist)}/${currentSelected.attackRange})`,
            "warning",
          );
        }
        return;
      }

      // Check if clicking on a reachable position → MOVE
      if (!currentSelected.hasMoved) {
        const nearestReachable = reachablePositions.find(
          (p) => getDistance(p, clickPos) < 18,
        );
        if (nearestReachable) {
          setGameState((prev) => {
            const newUnits = prev.units.map((u) =>
              u.id === currentSelected.id
                ? { ...u, position: nearestReachable, hasMoved: true }
                : u,
            );
            const newState = { ...prev, units: newUnits };
            const updatedUnit = newUnits.find(
              (u) => u.id === currentSelected.id,
            );
            if (updatedUnit) {
              setSelectedUnit(updatedUnit);
              computeHighlights(updatedUnit, newState);
            }
            // Update territory capture
            const newTerritories = updateTerritoryCapture(newState);
            return { ...newState, territories: newTerritories };
          });
          showFeedback("Unidade movida!", "info");
          return;
        }
      }

      // Clicked on empty space → deselect
      setSelectedUnit(null);
      setGameState((prev) => ({
        ...prev,
        units: prev.units.map((u) => ({ ...u, isSelected: false })),
      }));
      computeHighlights(null, state);
    },
    [reachablePositions, performAttack, computeHighlights, showFeedback],
  );

  const deselectUnit = useCallback(() => {
    setSelectedUnit(null);
    setReachablePositions([]);
    setAttackableUnitIds([]);
    setGameState((prev) => ({
      ...prev,
      units: prev.units.map((u) => ({ ...u, isSelected: false })),
    }));
  }, []);

  // ── End Turn ──────────────────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: updateTerritoryCapture is a stable inner function
  const endTurn = useCallback(() => {
    const state = gameStateRef.current;
    if (state.gameOver) return;

    deselectUnit();

    setGameState((prev) => {
      // Update territory capture
      const newTerritories = updateTerritoryCapture(prev);

      // Reduce cooldowns for current team
      const newUnits = prev.units.map((u) => {
        if (u.team !== prev.currentTeam) return u;
        return {
          ...u,
          hasMoved: false,
          hasActed: false,
          isSelected: false,
          fortifyTurnsRemaining: Math.max(0, u.fortifyTurnsRemaining - 1),
          moraleTurnsRemaining: Math.max(0, u.moraleTurnsRemaining - 1),
          attackDebuffTurns: Math.max(0, u.attackDebuffTurns - 1),
          attackBuffTurns: Math.max(0, u.attackBuffTurns - 1),
          invisibilityTurns: Math.max(0, u.invisibilityTurns - 1),
          isInvisible: u.invisibilityTurns > 1,
          isReloading: false,
          abilities: u.abilities.map((a) => ({
            ...a,
            currentCooldown: Math.max(0, a.currentCooldown - 1),
          })),
        };
      });

      const nextTeam: Team =
        prev.currentTeam === "NativePeoples" ? "Colonizers" : "NativePeoples";
      const newState = {
        ...prev,
        territories: newTerritories,
        units: newUnits,
        currentTeam: nextTeam,
        turnNumber: prev.turnNumber + 1,
      };

      // Process bot turns asynchronously
      processBotTurns(newState);

      return newState;
    });
  }, [deselectUnit]);

  // ── Bot turn processing ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: updateTerritoryCapture is a stable inner function
  const processBotTurns = useCallback(
    (initialState: GameState) => {
      const botUnits = initialState.units.filter(
        (u) => u.team === initialState.currentTeam && u.isBot && u.health > 0,
      );
      if (botUnits.length === 0) return;

      const teamCtx = computeTeamContext(
        initialState,
        initialState.currentTeam,
        players,
      );

      let delay = 400;
      for (const botUnit of botUnits) {
        setTimeout(() => {
          setGameState((prev) => {
            if (prev.gameOver) return prev;
            const freshUnit = prev.units.find((u) => u.id === botUnit.id);
            if (!freshUnit || freshUnit.health <= 0) return prev;

            const action = getBotAction(freshUnit, prev, teamCtx);

            if (
              action.type === "move" &&
              action.targetPosition &&
              !freshUnit.hasMoved
            ) {
              const newUnits = prev.units.map((u) =>
                u.id === freshUnit.id
                  ? { ...u, position: action.targetPosition!, hasMoved: true }
                  : u,
              );
              const newState = { ...prev, units: newUnits };
              const newTerritories = updateTerritoryCapture(newState);
              return { ...newState, territories: newTerritories };
            }

            if (
              action.type === "attack" &&
              action.targetUnitId &&
              !freshUnit.hasActed
            ) {
              return performAttack(freshUnit, action.targetUnitId, prev);
            }

            if (action.type === "ability" && action.abilityId) {
              // Handle ability actions inline
              const abilityIndex = freshUnit.abilities.findIndex(
                (a) => a.id === action.abilityId,
              );
              if (
                abilityIndex !== -1 &&
                freshUnit.abilities[abilityIndex].currentCooldown === 0
              ) {
                const updatedAbilities = freshUnit.abilities.map((a, i) =>
                  i === abilityIndex
                    ? { ...a, currentCooldown: a.cooldown }
                    : a,
                );
                const newUnits = prev.units.map((u) =>
                  u.id === freshUnit.id
                    ? { ...u, abilities: updatedAbilities, hasActed: true }
                    : u,
                );
                // Heal target if applicable
                if (
                  (action.abilityId === "heal" ||
                    action.abilityId === "heal_ally") &&
                  action.targetUnitId
                ) {
                  const targetIdx = newUnits.findIndex(
                    (u) => u.id === action.targetUnitId,
                  );
                  if (targetIdx !== -1) {
                    const healAmt = Math.round(
                      newUnits[targetIdx].maxHealth * 0.3,
                    );
                    newUnits[targetIdx] = {
                      ...newUnits[targetIdx],
                      health: Math.min(
                        newUnits[targetIdx].maxHealth,
                        newUnits[targetIdx].health + healAmt,
                      ),
                    };
                  }
                }
                return { ...prev, units: newUnits };
              }
            }

            if (
              action.type === "build" &&
              action.buildType &&
              !freshUnit.hasActed
            ) {
              const territory = getTerritoryAtPosition(
                prev.territories,
                freshUnit.position,
              );
              if (territory?.isBuildable && !territory.construction) {
                const newConstruction: Construction = {
                  id: `construction_${Date.now()}`,
                  type: action.buildType,
                  owner: freshUnit.team,
                  territoryId: territory.id,
                  health: action.buildType === "tower" ? 50 : 100,
                  maxHealth: action.buildType === "tower" ? 50 : 100,
                  constructionProgress: 100,
                };
                const newTerritories = prev.territories.map((t) =>
                  t.id === territory.id
                    ? { ...t, construction: newConstruction }
                    : t,
                );
                const newUnits = prev.units.map((u) =>
                  u.id === freshUnit.id ? { ...u, hasActed: true } : u,
                );
                return {
                  ...prev,
                  territories: newTerritories,
                  units: newUnits,
                  constructions: [...prev.constructions, newConstruction],
                };
              }
            }

            if (action.type === "destroy" && !freshUnit.hasActed) {
              const nearbyEnemyTerritory = prev.territories.find(
                (t) =>
                  t.construction &&
                  t.construction.owner !== freshUnit.team &&
                  getDistance(freshUnit.position, t.center) <
                    freshUnit.attackRange,
              );
              if (nearbyEnemyTerritory?.construction) {
                const newHealth = nearbyEnemyTerritory.construction.health - 50;
                const newTerritories = prev.territories.map((t) => {
                  if (t.id !== nearbyEnemyTerritory.id) return t;
                  if (newHealth <= 0) return { ...t, construction: null };
                  return {
                    ...t,
                    construction: { ...t.construction!, health: newHealth },
                  };
                });
                const newUnits = prev.units.map((u) =>
                  u.id === freshUnit.id ? { ...u, hasActed: true } : u,
                );
                return {
                  ...prev,
                  territories: newTerritories,
                  units: newUnits,
                };
              }
            }

            return prev;
          });
        }, delay);
        delay += 500;
      }
    },
    [players, performAttack],
  );

  const isGameOver = gameState.gameOver;

  return {
    gameState,
    selectedUnit,
    actionFeedback,
    reachablePositions,
    attackableUnitIds,
    handleCanvasClick,
    endTurn,
    deselectUnit,
    executeAbility,
    buildConstruction,
    destroyConstruction,
    applyTalentPath,
    isGameOver,
    players,
  };
}
