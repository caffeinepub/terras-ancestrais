export type Team = 'NativePeoples' | 'Colonizers';

export type TerrainType = 'forest' | 'plains' | 'river' | 'village' | 'fort' | 'hills';

export type ClassType =
  | 'ForestWarrior'
  | 'SpiritHunter'
  | 'Shaman'
  | 'Sentinel'
  | 'MusketSoldier'
  | 'Captain'
  | 'Engineer'
  | 'Missionary';

export type TalentPath = 'PathA' | 'PathB';

export interface ClassStats {
  health: number;
  attack: number;
  movement: number;
  attackRange: number;
  defense: number;
}

export interface ClassAbility {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive';
  cooldown: number; // turns
  currentCooldown: number;
}

export interface TalentUpgrade {
  name: string;
  description: string;
  statBonuses: Partial<ClassStats>;
  abilityUpgrades: string[];
}

export interface Position {
  x: number;
  y: number;
}

export interface PlayerSlot {
  id: string;
  name: string;
  isBot: boolean;
  team: Team;
  class: ClassType;
}

export interface Construction {
  id: string;
  type: 'tower' | 'fortress';
  owner: Team;
  territoryId: string;
  health: number;
  maxHealth: number;
  constructionProgress: number; // 0-100
}

export interface GameUnit {
  id: string;
  team: Team;
  classType: ClassType;
  position: Position;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  movementRange: number;
  attackRange: number;
  isSelected: boolean;
  hasMoved: boolean;
  hasActed: boolean;
  isBot: boolean;
  playerId: string;
  fortifyTurnsRemaining: number;
  moraleTurnsRemaining: number;
  flashTimer: number;
  // RPG progression
  xp: number;
  level: number; // 1-3
  talentPath: TalentPath | null;
  // Abilities
  abilities: ClassAbility[];
  // Status effects
  isInvisible: boolean;
  invisibilityTurns: number;
  markedEnemyId: string | null;
  attackDebuffTurns: number;
  attackBuffTurns: number;
  isReloading: boolean; // for MusketSoldier
  isBuilding: boolean;
  isDestroying: string | null; // construction ID being destroyed
}

export interface Territory {
  id: string;
  name: string;
  vertices: Position[];
  center: Position;
  owner: Team | null;
  captureProgress: number;
  capturingTeam: Team | null;
  terrain: TerrainType;
  isStrategicPoint: boolean;
  isElevated: boolean;
  isBuildable: boolean;
  construction: Construction | null;
  adjacentIds: string[];
  visibleToNatives: boolean;
  visibleToColonizers: boolean;
}

export interface GameState {
  territories: Territory[];
  units: GameUnit[];
  currentTeam: Team;
  turnNumber: number;
  timeRemaining: number; // seconds
  gameOver: boolean;
  winner: Team | null;
  constructions: Construction[];
  conquestCountdown: number | null; // seconds, null when not active
  pendingTalentSelections: string[]; // unit IDs awaiting talent choice
}

export const XP_THRESHOLDS = [0, 100, 250];

export const STRATEGIC_POINT_IDS = ['village', 'river', 'fort'];

export const CONQUEST_HOLD_DURATION = 600; // 10 minutes in seconds

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;
