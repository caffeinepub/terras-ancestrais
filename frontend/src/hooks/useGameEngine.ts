import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameState, GameUnit, Territory, PlayerSlot, Position, WinnerTeam } from '../types/game';
import { initializeUnits, INITIAL_TERRITORIES, MAP_WIDTH, MAP_HEIGHT, getDistance, getTerritoryAtPosition } from '../utils/gameInitializer';
import { runBotAction } from '../utils/botAI';
import { checkWinCondition } from '../utils/winConditions';

const GAME_DURATION = 600; // 10 minutes in seconds
const CAPTURE_RATE = 2; // progress per second when colonizer is in territory
const RECAPTURE_RATE = 1.5; // progress per second when native is in territory
const CAPTURE_THRESHOLD = 100;
const BOT_TICK_INTERVAL = 2500; // ms between bot actions

function deepCloneUnits(units: GameUnit[]): GameUnit[] {
  return units.map(u => ({ ...u, position: { ...u.position } }));
}

function deepCloneTerritories(territories: Territory[]): Territory[] {
  return territories.map(t => ({
    ...t,
    center: { ...t.center },
    vertices: t.vertices.map(v => ({ ...v })),
    occupants: [...t.occupants],
  }));
}

export function useGameEngine() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);

  const updateGameState = useCallback((updater: (prev: GameState) => GameState) => {
    setGameState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      gameStateRef.current = next;
      return next;
    });
  }, []);

  const stopAllIntervals = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (captureRef.current) clearInterval(captureRef.current);
    if (botRef.current) clearInterval(botRef.current);
    timerRef.current = null;
    captureRef.current = null;
    botRef.current = null;
    isRunningRef.current = false;
  }, []);

  const initGame = useCallback((players: PlayerSlot[], sessionId: string) => {
    stopAllIntervals();
    const units = initializeUnits(players);
    const territories = deepCloneTerritories(INITIAL_TERRITORIES);

    const initialState: GameState = {
      sessionId,
      status: 'playing',
      players,
      units,
      territories,
      currentTurn: 1,
      currentPlayerIndex: 0,
      timeRemaining: GAME_DURATION,
      winner: null,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
    };

    gameStateRef.current = initialState;
    setGameState(initialState);
    isRunningRef.current = true;
  }, [stopAllIntervals]);

  // Timer tick
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    timerRef.current = setInterval(() => {
      updateGameState(prev => {
        if (prev.status !== 'playing') return prev;
        const newTime = prev.timeRemaining - 1;
        const winner = checkWinCondition(prev.territories, newTime);
        if (winner) {
          stopAllIntervals();
          return { ...prev, timeRemaining: Math.max(0, newTime), status: 'gameover', winner };
        }
        return { ...prev, timeRemaining: Math.max(0, newTime) };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.status, updateGameState, stopAllIntervals]);

  // Territory capture tick
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    captureRef.current = setInterval(() => {
      updateGameState(prev => {
        if (prev.status !== 'playing') return prev;

        const newTerritories = deepCloneTerritories(prev.territories);
        const newUnits = deepCloneUnits(prev.units);

        // Update occupants for each territory
        for (const territory of newTerritories) {
          territory.occupants = newUnits
            .filter(u => u.health > 0 && getTerritoryAtPosition(u.position, [territory]) !== null)
            .map(u => u.id);

          const colonizerOccupants = territory.occupants.filter(uid => {
            const u = newUnits.find(u => u.id === uid);
            return u?.team === 'Colonizers';
          });
          const nativeOccupants = territory.occupants.filter(uid => {
            const u = newUnits.find(u => u.id === uid);
            return u?.team === 'NativePeoples';
          });

          if (colonizerOccupants.length > 0 && nativeOccupants.length === 0) {
            // Colonizers capturing
            territory.captureProgress = Math.min(CAPTURE_THRESHOLD, territory.captureProgress + CAPTURE_RATE);
            if (territory.captureProgress >= CAPTURE_THRESHOLD) {
              territory.owner = 'Colonizers';
            }
          } else if (nativeOccupants.length > 0 && colonizerOccupants.length === 0) {
            // Natives recapturing
            if (territory.owner === 'Colonizers') {
              territory.captureProgress = Math.max(0, territory.captureProgress - RECAPTURE_RATE);
              if (territory.captureProgress <= 0) {
                territory.owner = 'NativePeoples';
              }
            } else if (territory.owner === 'Neutral') {
              // Natives can also claim neutral territory
              territory.captureProgress = Math.max(0, territory.captureProgress - RECAPTURE_RATE * 0.5);
            }
          }
        }

        const winner = checkWinCondition(newTerritories, prev.timeRemaining);
        if (winner) {
          stopAllIntervals();
          return { ...prev, territories: newTerritories, status: 'gameover', winner };
        }

        return { ...prev, territories: newTerritories };
      });
    }, 1000);

    return () => {
      if (captureRef.current) clearInterval(captureRef.current);
    };
  }, [gameState?.status, updateGameState, stopAllIntervals]);

  // Bot AI tick
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    botRef.current = setInterval(() => {
      const state = gameStateRef.current;
      if (!state || state.status !== 'playing') return;

      const botUnits = state.units.filter(u => {
        const player = state.players.find(p => p.id === u.playerId);
        return player?.type === 'Bot' && u.health > 0;
      });

      if (botUnits.length === 0) return;

      updateGameState(prev => {
        if (prev.status !== 'playing') return prev;
        let newUnits = deepCloneUnits(prev.units);
        let newTerritories = deepCloneTerritories(prev.territories);

        // Reset bot units' move/act flags
        newUnits = newUnits.map(u => {
          const player = prev.players.find(p => p.id === u.playerId);
          if (player?.type === 'Bot') {
            return { ...u, hasMoved: false, hasActed: false };
          }
          return u;
        });

        const stateForBot = { ...prev, units: newUnits, territories: newTerritories };

        for (const botUnit of botUnits) {
          const currentUnit = newUnits.find(u => u.id === botUnit.id);
          if (!currentUnit || currentUnit.health <= 0) continue;

          runBotAction(
            currentUnit,
            stateForBot,
            (unitId, pos) => {
              const idx = newUnits.findIndex(u => u.id === unitId);
              if (idx !== -1) {
                newUnits[idx] = { ...newUnits[idx], position: pos, hasMoved: true };
              }
            },
            (attackerId, targetId) => {
              const attacker = newUnits.find(u => u.id === attackerId);
              const targetIdx = newUnits.findIndex(u => u.id === targetId);
              if (attacker && targetIdx !== -1) {
                const target = newUnits[targetIdx];
                const defenseBonus = target.isFortified ? 1.5 : 1;
                const damage = Math.max(5, attacker.attack - target.defense / defenseBonus + Math.random() * 10 - 5);
                newUnits[targetIdx] = {
                  ...target,
                  health: Math.max(0, target.health - damage),
                };
                const attackerIdx = newUnits.findIndex(u => u.id === attackerId);
                if (attackerIdx !== -1) {
                  newUnits[attackerIdx] = { ...newUnits[attackerIdx], hasActed: true };
                }
              }
            },
            (unitId) => {
              const idx = newUnits.findIndex(u => u.id === unitId);
              if (idx !== -1) {
                newUnits[idx] = { ...newUnits[idx], isFortified: true, hasActed: true };
              }
            }
          );
        }

        return { ...prev, units: newUnits, territories: newTerritories };
      });
    }, BOT_TICK_INTERVAL);

    return () => {
      if (botRef.current) clearInterval(botRef.current);
    };
  }, [gameState?.status, updateGameState, stopAllIntervals]);

  const moveUnit = useCallback((unitId: string, newPos: Position) => {
    updateGameState(prev => {
      const unitIdx = prev.units.findIndex(u => u.id === unitId);
      if (unitIdx === -1) return prev;
      const unit = prev.units[unitIdx];
      if (unit.hasMoved || unit.health <= 0) return prev;

      const dist = getDistance(unit.position, newPos);
      if (dist > unit.movementRange) return prev;

      const newUnits = deepCloneUnits(prev.units);
      newUnits[unitIdx] = {
        ...newUnits[unitIdx],
        position: { ...newPos },
        hasMoved: true,
        isFortified: false,
      };
      return { ...prev, units: newUnits };
    });
  }, [updateGameState]);

  const attackUnit = useCallback((attackerId: string, targetId: string) => {
    updateGameState(prev => {
      const attackerIdx = prev.units.findIndex(u => u.id === attackerId);
      const targetIdx = prev.units.findIndex(u => u.id === targetId);
      if (attackerIdx === -1 || targetIdx === -1) return prev;

      const attacker = prev.units[attackerIdx];
      const target = prev.units[targetIdx];

      if (attacker.hasActed || attacker.health <= 0 || target.health <= 0) return prev;
      if (attacker.team === target.team) return prev;

      const dist = getDistance(attacker.position, target.position);
      if (dist > 80) return prev;

      const defenseBonus = target.isFortified ? 1.5 : 1;
      const damage = Math.max(5, attacker.attack - target.defense / defenseBonus + Math.random() * 10 - 5);

      const newUnits = deepCloneUnits(prev.units);
      newUnits[targetIdx] = { ...newUnits[targetIdx], health: Math.max(0, target.health - damage) };
      newUnits[attackerIdx] = { ...newUnits[attackerIdx], hasActed: true };

      return { ...prev, units: newUnits };
    });
  }, [updateGameState]);

  const fortifyUnit = useCallback((unitId: string) => {
    updateGameState(prev => {
      const unitIdx = prev.units.findIndex(u => u.id === unitId);
      if (unitIdx === -1) return prev;
      const unit = prev.units[unitIdx];
      if (unit.hasActed || unit.health <= 0) return prev;

      const newUnits = deepCloneUnits(prev.units);
      newUnits[unitIdx] = { ...newUnits[unitIdx], isFortified: true, hasActed: true };
      return { ...prev, units: newUnits };
    });
  }, [updateGameState]);

  const selectUnit = useCallback((unitId: string | null) => {
    updateGameState(prev => {
      const newUnits = prev.units.map(u => ({
        ...u,
        isSelected: u.id === unitId,
      }));
      return { ...prev, units: newUnits };
    });
  }, [updateGameState]);

  const endTurn = useCallback(() => {
    updateGameState(prev => {
      const newUnits = prev.units.map(u => ({
        ...u,
        hasMoved: false,
        hasActed: false,
        isSelected: false,
      }));
      return {
        ...prev,
        units: newUnits,
        currentTurn: prev.currentTurn + 1,
      };
    });
  }, [updateGameState]);

  const resetGame = useCallback(() => {
    stopAllIntervals();
    setGameState(null);
    gameStateRef.current = null;
  }, [stopAllIntervals]);

  useEffect(() => {
    return () => stopAllIntervals();
  }, [stopAllIntervals]);

  return {
    gameState,
    initGame,
    moveUnit,
    attackUnit,
    fortifyUnit,
    selectUnit,
    endTurn,
    resetGame,
  };
}
