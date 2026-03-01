import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, GameUnit, Territory, Team, TalentPath, Construction } from '../types/game';
import { CONQUEST_HOLD_DURATION, XP_THRESHOLDS } from '../types/game';
import type { PlayerSlot } from '../types/game';
import {
  initializeGameState, getDistance, getTerritoryAtPosition,
  TALENT_PATHS, XP_GAINS, isPointInPolygon,
} from '../utils/gameInitializer';
import { checkWinCondition, checkColonizerStrategicControl } from '../utils/winConditions';
import { getBotAction, selectTalentPathForBot } from '../utils/botAI';

export interface UseGameEngineReturn {
  gameState: GameState;
  selectedUnit: GameUnit | null;
  actionFeedback: string | null;
  handleCanvasClick: (x: number, y: number) => void;
  endTurn: () => void;
  deselectUnit: () => void;
  executeAbility: (unitId: string, abilityId: string, targetId?: string) => void;
  buildConstruction: (unitId: string, buildType: 'tower' | 'fortress') => void;
  destroyConstruction: (unitId: string) => void;
  applyTalentPath: (unitId: string, path: TalentPath) => void;
  isGameOver: boolean;
}

export function useGameEngine(players: PlayerSlot[]): UseGameEngineReturn {
  const [gameState, setGameState] = useState<GameState>(() => initializeGameState(players));
  const [selectedUnit, setSelectedUnit] = useState<GameUnit | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const showFeedback = useCallback((msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2000);
  }, []);

  // Timer
  useEffect(() => {
    if (gameState.gameOver) return;
    timerRef.current = setInterval(() => {
      setGameState(prev => {
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
        const newState = { ...prev, timeRemaining: newTimeRemaining, conquestCountdown: newConquestCountdown };
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
      setGameState(prev => ({
        ...prev,
        units: prev.units.map(u => ({
          ...u,
          flashTimer: u.flashTimer > 0 ? u.flashTimer - 1 : 0,
        })),
      }));
    }, 100);
    return () => clearInterval(flashInterval);
  }, []);

  const grantXP = useCallback((unitId: string, amount: number, state: GameState): GameState => {
    const unitIndex = state.units.findIndex(u => u.id === unitId);
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
  }, []);

  const applyTalentPath = useCallback((unitId: string, path: TalentPath) => {
    setGameState(prev => {
      const unitIndex = prev.units.findIndex(u => u.id === unitId);
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
      const pendingTalentSelections = prev.pendingTalentSelections.filter(id => id !== unitId);
      return { ...prev, units: newUnits, pendingTalentSelections };
    });
  }, []);

  function autoApplyBotTalents(state: GameState): GameState {
    let newState = state;
    for (const unit of state.units) {
      if (unit.isBot && unit.level === 2 && unit.talentPath === null) {
        const path = selectTalentPathForBot(unit.classType);
        const unitIndex = newState.units.findIndex(u => u.id === unit.id);
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
    return state.territories.map(territory => {
      const unitsOnTerritory = state.units.filter(u =>
        u.health > 0 && isPointInPolygon(u.position, territory.vertices)
      );
      const nativeUnits = unitsOnTerritory.filter(u => u.team === 'NativePeoples');
      const colonizerUnits = unitsOnTerritory.filter(u => u.team === 'Colonizers');

      if (nativeUnits.length > 0 && colonizerUnits.length === 0) {
        const delta = territory.capturingTeam === 'NativePeoples' ? 10 : -10;
        const newProgress = Math.max(0, Math.min(100, territory.captureProgress + delta));
        const newOwner: Team | null = newProgress >= 100 ? 'NativePeoples' : (newProgress <= 0 ? null : territory.owner);
        return { ...territory, captureProgress: newProgress, capturingTeam: 'NativePeoples' as Team, owner: newOwner };
      } else if (colonizerUnits.length > 0 && nativeUnits.length === 0) {
        const delta = territory.capturingTeam === 'Colonizers' ? 10 : -10;
        const newProgress = Math.max(0, Math.min(100, territory.captureProgress + delta));
        const newOwner: Team | null = newProgress >= 100 ? 'Colonizers' : (newProgress <= 0 ? null : territory.owner);
        return { ...territory, captureProgress: newProgress, capturingTeam: 'Colonizers' as Team, owner: newOwner };
      }
      return territory;
    });
  }

  const performAttack = useCallback((attacker: GameUnit, targetId: string, state: GameState): GameState => {
    const target = state.units.find(u => u.id === targetId);
    if (!target) return state;

    const dist = getDistance(attacker.position, target.position);
    if (dist > attacker.attackRange) return state;

    let damage = attacker.attack;

    const attackerTerritory = getTerritoryAtPosition(state.territories, attacker.position);
    if (attacker.classType === 'ForestWarrior' && attackerTerritory?.terrain === 'forest') damage *= 1.15;
    if (attacker.classType === 'MusketSoldier' && attackerTerritory?.terrain === 'plains') damage *= 1.10;
    if (attackerTerritory?.isElevated) damage *= 1.10;
    if (attacker.markedEnemyId === targetId) damage *= 1.25;
    if (attacker.attackDebuffTurns > 0) damage *= 0.7;

    const targetTerritory = getTerritoryAtPosition(state.territories, target.position);
    if (targetTerritory?.construction?.type === 'fortress' && targetTerritory.construction.owner === target.team) {
      damage *= 0.75;
    }

    damage = Math.max(1, Math.round(damage - target.defense * 0.3));
    const newTargetHealth = Math.max(0, target.health - damage);
    const isKill = newTargetHealth <= 0;

    let newUnits = state.units.map(u => {
      if (u.id === targetId) return { ...u, health: newTargetHealth, flashTimer: 5 };
      if (u.id === attacker.id) return { ...u, hasActed: true };
      return u;
    });

    let newState = { ...state, units: newUnits };

    if (isKill) {
      newState = grantXP(attacker.id, XP_GAINS.ELIMINATE_ENEMY, newState);
      const nearbyAllies = state.units.filter(u =>
        u.team === attacker.team && u.id !== attacker.id &&
        getDistance(u.position, attacker.position) < 200
      );
      for (const ally of nearbyAllies) {
        newState = grantXP(ally.id, XP_GAINS.ASSIST_KILL, newState);
      }
    }

    newState = autoApplyBotTalents(newState);
    return newState;
  }, [grantXP]);

  const executeAbility = useCallback((unitId: string, abilityId: string, targetId?: string) => {
    setGameState(prev => {
      const unitIndex = prev.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return prev;

      const unit = prev.units[unitIndex];
      const abilityIndex = unit.abilities.findIndex(a => a.id === abilityId);
      if (abilityIndex === -1) return prev;

      const ability = unit.abilities[abilityIndex];
      if (ability.currentCooldown > 0) return prev;

      let newUnits = [...prev.units];
      const updatedAbilities = unit.abilities.map((a, i) =>
        i === abilityIndex ? { ...a, currentCooldown: a.cooldown } : a
      );

      switch (abilityId) {
        case 'camouflage': {
          newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, isInvisible: true, invisibilityTurns: 2, hasActed: true };
          showFeedback('Camuflagem ativada!');
          break;
        }
        case 'mark_enemy': {
          if (targetId) {
            newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, markedEnemyId: targetId, hasActed: true };
            showFeedback('Inimigo marcado!');
          }
          break;
        }
        case 'heal':
        case 'heal_ally': {
          if (targetId) {
            const targetIndex = newUnits.findIndex(u => u.id === targetId);
            if (targetIndex !== -1) {
              const target = newUnits[targetIndex];
              const healAmount = Math.round(target.maxHealth * 0.3);
              newUnits[targetIndex] = { ...target, health: Math.min(target.maxHealth, target.health + healAmount) };
              newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true };
              showFeedback(`Curou ${healAmount} HP!`);
            }
          }
          break;
        }
        case 'weaken':
        case 'pacify': {
          if (targetId) {
            const targetIndex = newUnits.findIndex(u => u.id === targetId);
            if (targetIndex !== -1) {
              newUnits[targetIndex] = { ...newUnits[targetIndex], attackDebuffTurns: 2 };
              newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true };
              showFeedback('Inimigo enfraquecido!');
            }
          }
          break;
        }
        case 'formation_buff': {
          const nearbyAllies = newUnits.filter(u =>
            u.team === unit.team && u.id !== unitId &&
            getDistance(u.position, unit.position) < 150
          );
          newUnits = newUnits.map(u => {
            if (nearbyAllies.find(a => a.id === u.id)) return { ...u, attackBuffTurns: 2 };
            return u;
          });
          newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true };
          showFeedback(`Formação! ${nearbyAllies.length} aliados buffados`);
          break;
        }
        case 'rally': {
          const nearbyAllies = newUnits.filter(u =>
            u.team === unit.team && u.id !== unitId &&
            getDistance(u.position, unit.position) < 150
          );
          newUnits = newUnits.map(u => {
            if (nearbyAllies.find(a => a.id === u.id)) {
              const healAmount = Math.round(u.maxHealth * 0.15);
              return { ...u, health: Math.min(u.maxHealth, u.health + healAmount) };
            }
            return u;
          });
          newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true };
          showFeedback('Reagrupamento!');
          break;
        }
        case 'musket_fire': {
          if (targetId) {
            const targetIndex = newUnits.findIndex(u => u.id === targetId);
            if (targetIndex !== -1) {
              const damage = Math.round(unit.attack * 1.8);
              const newHealth = Math.max(0, newUnits[targetIndex].health - damage);
              newUnits[targetIndex] = { ...newUnits[targetIndex], health: newHealth, flashTimer: 5 };
              newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true, isReloading: true };
              showFeedback(`Disparo! ${damage} dano`);
            }
          }
          break;
        }
        case 'barricade': {
          newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true };
          showFeedback('Barricada construída!');
          break;
        }
        case 'destroy': {
          const nearbyEnemyConstruction = prev.territories.find(t =>
            t.construction && t.construction.owner !== unit.team &&
            getDistance(unit.position, t.center) < unit.attackRange
          );
          if (nearbyEnemyConstruction?.construction) {
            newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true, isDestroying: nearbyEnemyConstruction.construction.id };
            showFeedback('Destruindo construção inimiga!');
          }
          break;
        }
        default:
          newUnits[unitIndex] = { ...unit, abilities: updatedAbilities, hasActed: true };
      }

      return { ...prev, units: newUnits };
    });
  }, [showFeedback]);

  const buildConstruction = useCallback((unitId: string, buildType: 'tower' | 'fortress') => {
    setGameState(prev => {
      const unit = prev.units.find(u => u.id === unitId);
      if (!unit) return prev;

      const territory = getTerritoryAtPosition(prev.territories, unit.position);
      if (!territory?.isBuildable || territory.construction) return prev;

      const newConstruction: Construction = {
        id: `construction_${Date.now()}`,
        type: buildType,
        owner: unit.team,
        territoryId: territory.id,
        health: buildType === 'tower' ? 50 : 100,
        maxHealth: buildType === 'tower' ? 50 : 100,
        constructionProgress: 100,
      };

      const newTerritories = prev.territories.map(t =>
        t.id === territory.id ? { ...t, construction: newConstruction } : t
      );
      const newUnits = prev.units.map(u => u.id === unitId ? { ...u, hasActed: true } : u);

      showFeedback(`${buildType === 'tower' ? 'Torre' : 'Fortaleza'} construída!`);
      return { ...prev, territories: newTerritories, units: newUnits, constructions: [...prev.constructions, newConstruction] };
    });
  }, [showFeedback]);

  const destroyConstruction = useCallback((unitId: string) => {
    setGameState(prev => {
      const unit = prev.units.find(u => u.id === unitId);
      if (!unit) return prev;

      const nearbyEnemyTerritory = prev.territories.find(t =>
        t.construction && t.construction.owner !== unit.team &&
        getDistance(unit.position, t.center) < unit.attackRange
      );

      if (!nearbyEnemyTerritory?.construction) return prev;

      const newHealth = nearbyEnemyTerritory.construction.health - 50;
      let newTerritories: Territory[];

      if (newHealth <= 0) {
        newTerritories = prev.territories.map(t =>
          t.id === nearbyEnemyTerritory.id ? { ...t, construction: null } : t
        );
        showFeedback('Construção destruída!');
      } else {
        newTerritories = prev.territories.map(t =>
          t.id === nearbyEnemyTerritory.id
            ? { ...t, construction: { ...t.construction!, health: newHealth } }
            : t
        );
        showFeedback('Construção danificada!');
      }

      const newUnits = prev.units.map(u => u.id === unitId ? { ...u, hasActed: true } : u);
      return { ...prev, territories: newTerritories, units: newUnits };
    });
  }, [showFeedback]);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    const state = gameStateRef.current;
    if (state.gameOver) return;

    const clickPos = { x, y };

    // Check if clicking on a unit of current team (human only)
    const clickedUnit = state.units.find(u => {
      if (u.team !== state.currentTeam || u.health <= 0 || u.isBot) return false;
      return getDistance(u.position, clickPos) < 20;
    });

    if (clickedUnit) {
      const isAlreadySelected = selectedUnit?.id === clickedUnit.id;
      if (isAlreadySelected) {
        setSelectedUnit(null);
        setGameState(prev => ({ ...prev, units: prev.units.map(u => ({ ...u, isSelected: false })) }));
      } else {
        setSelectedUnit(clickedUnit);
        setGameState(prev => ({ ...prev, units: prev.units.map(u => ({ ...u, isSelected: u.id === clickedUnit.id })) }));
      }
      return;
    }

    if (selectedUnit) {
      const unit = state.units.find(u => u.id === selectedUnit.id);
      if (!unit) return;

      // Check if clicking on enemy to attack
      const enemyUnit = state.units.find(u => {
        if (u.team === state.currentTeam || u.health <= 0 || u.isInvisible) return false;
        return getDistance(u.position, clickPos) < 20;
      });

      if (enemyUnit && !unit.hasActed) {
        const dist = getDistance(unit.position, enemyUnit.position);
        if (dist <= unit.attackRange) {
          const newState = performAttack(unit, enemyUnit.id, state);
          setGameState(newState);
          gameStateRef.current = newState;
          const updatedUnit = newState.units.find(u => u.id === unit.id);
          if (updatedUnit) setSelectedUnit(updatedUnit);
          showFeedback(`Atacou!`);
          return;
        }
      }

      // Move unit
      if (!unit.hasMoved) {
        const dist = getDistance(unit.position, clickPos);
        if (dist <= unit.movementRange) {
          const newUnits = state.units.map(u =>
            u.id === unit.id ? { ...u, position: clickPos, hasMoved: true } : u
          );
          const newTerritories = updateTerritoryCapture({ ...state, units: newUnits });
          let newState = { ...state, units: newUnits, territories: newTerritories };

          const territory = getTerritoryAtPosition(newTerritories, clickPos);
          if (territory && territory.capturingTeam === unit.team) {
            newState = grantXP(unit.id, XP_GAINS.TERRITORY_DEFENSE, newState);
          }

          setGameState(newState);
          gameStateRef.current = newState;
          const updatedUnit = newState.units.find(u => u.id === unit.id);
          if (updatedUnit) setSelectedUnit(updatedUnit);
          return;
        }
      }

      // Deselect
      setSelectedUnit(null);
      setGameState(prev => ({ ...prev, units: prev.units.map(u => ({ ...u, isSelected: false })) }));
    }
  }, [selectedUnit, performAttack, grantXP, showFeedback]);

  const deselectUnit = useCallback(() => {
    setSelectedUnit(null);
    setGameState(prev => ({ ...prev, units: prev.units.map(u => ({ ...u, isSelected: false })) }));
  }, []);

  function runBotTurn(state: GameState): GameState {
    const botUnits = state.units.filter(u =>
      u.team === state.currentTeam && u.isBot && u.health > 0
    );

    let newState = { ...state };

    for (const botUnit of botUnits) {
      const unit = newState.units.find(u => u.id === botUnit.id);
      if (!unit) continue;

      // Auto-apply talent if needed
      if (unit.level === 2 && unit.talentPath === null) {
        const path = selectTalentPathForBot(unit.classType);
        const talentData = TALENT_PATHS[unit.classType][path];
        const bonuses = talentData.statBonuses;
        newState = {
          ...newState,
          units: newState.units.map(u =>
            u.id === unit.id ? {
              ...u, talentPath: path,
              health: u.health + (bonuses.health || 0),
              maxHealth: u.maxHealth + (bonuses.health || 0),
              attack: u.attack + (bonuses.attack || 0),
              defense: u.defense + (bonuses.defense || 0),
              movementRange: u.movementRange + (bonuses.movement || 0),
              attackRange: u.attackRange + (bonuses.attackRange || 0),
            } : u
          ),
        };
      }

      const currentUnit = newState.units.find(u => u.id === botUnit.id);
      if (!currentUnit) continue;

      const action = getBotAction(currentUnit, newState);

      if (action.type === 'move' && action.targetPosition && !currentUnit.hasMoved) {
        const newPos = action.targetPosition;
        newState = {
          ...newState,
          units: newState.units.map(u =>
            u.id === currentUnit.id ? { ...u, position: newPos, hasMoved: true } : u
          ),
        };
        const newTerritories = updateTerritoryCapture(newState);
        newState = { ...newState, territories: newTerritories };
      } else if (action.type === 'attack' && action.targetUnitId) {
        const target = newState.units.find(u => u.id === action.targetUnitId);
        if (target && !currentUnit.hasActed) {
          // Move toward enemy first if needed
          if (!currentUnit.hasMoved) {
            const dist = getDistance(currentUnit.position, target.position);
            if (dist > currentUnit.attackRange) {
              const dx = target.position.x - currentUnit.position.x;
              const dy = target.position.y - currentUnit.position.y;
              const moveStep = Math.min(currentUnit.movementRange, dist - currentUnit.attackRange + 10);
              const newPos = {
                x: currentUnit.position.x + (dx / dist) * moveStep,
                y: currentUnit.position.y + (dy / dist) * moveStep,
              };
              newState = {
                ...newState,
                units: newState.units.map(u =>
                  u.id === currentUnit.id ? { ...u, position: newPos, hasMoved: true } : u
                ),
              };
            }
          }
          const updatedUnit = newState.units.find(u => u.id === currentUnit.id);
          if (updatedUnit && !updatedUnit.hasActed) {
            newState = performAttack(updatedUnit, action.targetUnitId, newState);
          }
        }
      } else if (action.type === 'build' && action.buildType) {
        const cu = newState.units.find(u => u.id === currentUnit.id);
        if (cu && !cu.hasActed) {
          const territory = getTerritoryAtPosition(newState.territories, cu.position);
          if (territory?.isBuildable && !territory.construction) {
            const newConstruction: Construction = {
              id: `construction_${Date.now()}_${cu.id}`,
              type: action.buildType,
              owner: cu.team,
              territoryId: territory.id,
              health: action.buildType === 'tower' ? 50 : 100,
              maxHealth: action.buildType === 'tower' ? 50 : 100,
              constructionProgress: 100,
            };
            newState = {
              ...newState,
              territories: newState.territories.map(t =>
                t.id === territory.id ? { ...t, construction: newConstruction } : t
              ),
              units: newState.units.map(u => u.id === cu.id ? { ...u, hasActed: true } : u),
              constructions: [...newState.constructions, newConstruction],
            };
          }
        }
      }
    }

    return newState;
  }

  const endTurn = useCallback(() => {
    setGameState(prev => {
      const nextTeam: Team = prev.currentTeam === 'NativePeoples' ? 'Colonizers' : 'NativePeoples';

      let newUnits = prev.units.map(u => {
        if (u.team === nextTeam) {
          return {
            ...u,
            hasMoved: false,
            hasActed: false,
            isSelected: false,
            abilities: u.abilities.map(a => ({ ...a, currentCooldown: Math.max(0, a.currentCooldown - 1) })),
            invisibilityTurns: Math.max(0, u.invisibilityTurns - 1),
            isInvisible: u.invisibilityTurns > 1,
            attackDebuffTurns: Math.max(0, u.attackDebuffTurns - 1),
            attackBuffTurns: Math.max(0, u.attackBuffTurns - 1),
            isReloading: false,
          };
        }
        return u;
      });

      let newState = { ...prev, units: newUnits, currentTeam: nextTeam, turnNumber: prev.turnNumber + 1 };

      // Award defense XP
      for (const territory of newState.territories) {
        if (territory.isStrategicPoint) {
          const defendingUnits = newState.units.filter(u =>
            u.team === territory.owner && u.health > 0 &&
            isPointInPolygon(u.position, territory.vertices)
          );
          for (const defender of defendingUnits) {
            newState = grantXP(defender.id, XP_GAINS.TERRITORY_DEFENSE, newState);
          }
        }
      }

      // Run bot turn
      const hasBots = newState.units.some(u => u.team === nextTeam && u.isBot && u.health > 0);
      if (hasBots) {
        newState = runBotTurn(newState);
        // Switch back to human team
        const humanTeam: Team = nextTeam === 'NativePeoples' ? 'Colonizers' : 'NativePeoples';
        const hasHumans = newState.units.some(u => u.team === humanTeam && !u.isBot && u.health > 0);
        if (hasHumans) {
          newState = {
            ...newState,
            currentTeam: humanTeam,
            units: newState.units.map(u => {
              if (u.team === humanTeam) {
                return {
                  ...u,
                  hasMoved: false,
                  hasActed: false,
                  abilities: u.abilities.map(a => ({ ...a, currentCooldown: Math.max(0, a.currentCooldown - 1) })),
                  invisibilityTurns: Math.max(0, u.invisibilityTurns - 1),
                  isInvisible: u.invisibilityTurns > 1,
                  attackDebuffTurns: Math.max(0, u.attackDebuffTurns - 1),
                  attackBuffTurns: Math.max(0, u.attackBuffTurns - 1),
                };
              }
              return u;
            }),
          };
        }
      }

      setSelectedUnit(null);
      return newState;
    });
    showFeedback('Turno encerrado!');
  }, [grantXP, showFeedback, performAttack]);

  return {
    gameState,
    selectedUnit,
    actionFeedback,
    handleCanvasClick,
    endTurn,
    deselectUnit,
    executeAbility,
    buildConstruction,
    destroyConstruction,
    applyTalentPath,
    isGameOver: gameState.gameOver,
  };
}
