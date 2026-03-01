import type { Territory, WinnerTeam } from '../types/game';

export function checkWinCondition(
  territories: Territory[],
  timeRemaining: number
): WinnerTeam {
  // Colonizers win if all territories are colonizer-controlled
  const allConquered = territories.every(t => t.owner === 'Colonizers');
  if (allConquered) return 'Colonizers';

  // Native Peoples win if time runs out and not all territories are conquered
  if (timeRemaining <= 0) return 'NativePeoples';

  return null;
}

export function getColonizerProgress(territories: Territory[]): number {
  const conquered = territories.filter(t => t.owner === 'Colonizers').length;
  return Math.round((conquered / territories.length) * 100);
}
