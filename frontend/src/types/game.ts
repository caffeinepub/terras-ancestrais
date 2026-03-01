export type Team = 'NativePeoples' | 'Colonizers';
export type SlotType = 'Player' | 'Bot';
export type TerritoryOwner = 'Neutral' | 'NativePeoples' | 'Colonizers';
export type GameStatus = 'lobby' | 'playing' | 'gameover';
export type WinnerTeam = 'NativePeoples' | 'Colonizers' | null;
export type UnitAction = 'move' | 'attack' | 'fortify' | 'idle';

export interface PlayerSlot {
  id: number;
  name: string;
  type: SlotType;
  team: Team;
}

export interface Position {
  x: number;
  y: number;
}

export interface GameUnit {
  id: string;
  playerId: number;
  team: Team;
  position: Position;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  movementRange: number;
  isSelected: boolean;
  hasMoved: boolean;
  hasActed: boolean;
  isFortified: boolean;
}

export interface Territory {
  id: string;
  name: string;
  owner: TerritoryOwner;
  captureProgress: number; // 0-100, how much colonizers have captured
  vertices: Position[]; // polygon vertices for rendering
  center: Position;
  occupants: string[]; // unit IDs currently in territory
}

export interface GameState {
  sessionId: string;
  status: GameStatus;
  players: PlayerSlot[];
  units: GameUnit[];
  territories: Territory[];
  currentTurn: number;
  currentPlayerIndex: number;
  timeRemaining: number; // seconds
  winner: WinnerTeam;
  mapWidth: number;
  mapHeight: number;
}

export interface LobbyState {
  players: PlayerSlot[];
}
