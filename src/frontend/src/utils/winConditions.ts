import {
  CONQUEST_HOLD_DURATION,
  type GameState,
  STRATEGIC_POINT_IDS,
  type Team,
} from "../types/game";

export function checkColonizerStrategicControl(state: GameState): boolean {
  return STRATEGIC_POINT_IDS.every((id) => {
    const territory = state.territories.find((t) => t.id === id);
    return territory && territory.owner === "Colonizers";
  });
}

export function checkWinCondition(state: GameState): Team | null {
  // Colonizers win if conquest countdown reaches 0
  if (state.conquestCountdown !== null && state.conquestCountdown <= 0) {
    return "Colonizers";
  }

  // Native Peoples win if time runs out
  if (state.timeRemaining <= 0) {
    return "NativePeoples";
  }

  return null;
}

export function calculateConquestProgress(state: GameState): {
  isActive: boolean;
  holdDuration: number;
  remaining: number;
} {
  const isActive = checkColonizerStrategicControl(state);
  const holdDuration =
    state.conquestCountdown !== null
      ? CONQUEST_HOLD_DURATION - state.conquestCountdown
      : 0;
  const remaining = state.conquestCountdown ?? CONQUEST_HOLD_DURATION;
  return { isActive, holdDuration, remaining };
}
