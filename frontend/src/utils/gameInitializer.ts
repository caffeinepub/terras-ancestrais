import type { GameUnit, Territory, PlayerSlot, Position } from '../types/game';

// Map dimensions
export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 600;

// Territory definitions - 6 territories with polygon vertices
export const INITIAL_TERRITORIES: Territory[] = [
  {
    id: 'territory-1',
    name: 'Floresta Sagrada',
    owner: 'NativePeoples',
    captureProgress: 0,
    vertices: [
      { x: 50, y: 50 },
      { x: 220, y: 50 },
      { x: 240, y: 180 },
      { x: 180, y: 220 },
      { x: 50, y: 200 },
    ],
    center: { x: 148, y: 140 },
    occupants: [],
  },
  {
    id: 'territory-2',
    name: 'Vale dos Ancestrais',
    owner: 'NativePeoples',
    captureProgress: 0,
    vertices: [
      { x: 50, y: 220 },
      { x: 180, y: 240 },
      { x: 200, y: 380 },
      { x: 100, y: 420 },
      { x: 50, y: 380 },
    ],
    center: { x: 116, y: 332 },
    occupants: [],
  },
  {
    id: 'territory-3',
    name: 'Planícies Centrais',
    owner: 'Neutral',
    captureProgress: 0,
    vertices: [
      { x: 260, y: 80 },
      { x: 460, y: 60 },
      { x: 500, y: 200 },
      { x: 440, y: 300 },
      { x: 280, y: 320 },
      { x: 220, y: 200 },
    ],
    center: { x: 360, y: 193 },
    occupants: [],
  },
  {
    id: 'territory-4',
    name: 'Rio das Pedras',
    owner: 'Neutral',
    captureProgress: 0,
    vertices: [
      { x: 240, y: 340 },
      { x: 440, y: 320 },
      { x: 480, y: 460 },
      { x: 360, y: 520 },
      { x: 200, y: 480 },
    ],
    center: { x: 344, y: 428 },
    occupants: [],
  },
  {
    id: 'territory-5',
    name: 'Costa do Novo Mundo',
    owner: 'Colonizers',
    captureProgress: 100,
    vertices: [
      { x: 520, y: 50 },
      { x: 720, y: 50 },
      { x: 740, y: 200 },
      { x: 640, y: 260 },
      { x: 500, y: 220 },
    ],
    center: { x: 624, y: 156 },
    occupants: [],
  },
  {
    id: 'territory-6',
    name: 'Porto dos Conquistadores',
    owner: 'Colonizers',
    captureProgress: 100,
    vertices: [
      { x: 520, y: 280 },
      { x: 700, y: 260 },
      { x: 760, y: 420 },
      { x: 640, y: 500 },
      { x: 480, y: 480 },
    ],
    center: { x: 620, y: 388 },
    occupants: [],
  },
];

export function initializeUnits(players: PlayerSlot[]): GameUnit[] {
  const units: GameUnit[] = [];

  const nativePlayers = players.filter(p => p.team === 'NativePeoples');
  const colonizerPlayers = players.filter(p => p.team === 'Colonizers');

  // Native spawn positions (left side of map)
  const nativeSpawns: Position[] = [
    { x: 100, y: 120 },
    { x: 130, y: 160 },
    { x: 100, y: 300 },
    { x: 130, y: 340 },
  ];

  // Colonizer spawn positions (right side of map)
  const colonizerSpawns: Position[] = [
    { x: 620, y: 120 },
    { x: 660, y: 160 },
    { x: 620, y: 360 },
    { x: 660, y: 400 },
  ];

  nativePlayers.forEach((player, idx) => {
    units.push({
      id: `unit-native-${player.id}`,
      playerId: player.id,
      team: 'NativePeoples',
      position: nativeSpawns[idx] || { x: 100 + idx * 30, y: 200 },
      health: 100,
      maxHealth: 100,
      attack: 18,
      defense: 12,
      movementRange: 80,
      isSelected: false,
      hasMoved: false,
      hasActed: false,
      isFortified: false,
    });
  });

  colonizerPlayers.forEach((player, idx) => {
    units.push({
      id: `unit-colonizer-${player.id}`,
      playerId: player.id,
      team: 'Colonizers',
      position: colonizerSpawns[idx] || { x: 620 + idx * 30, y: 300 },
      health: 100,
      maxHealth: 100,
      attack: 20,
      defense: 10,
      movementRange: 75,
      isSelected: false,
      hasMoved: false,
      hasActed: false,
      isFortified: false,
    });
  });

  return units;
}

export function getDistance(a: Position, b: Position): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

export function isPointInPolygon(point: Position, vertices: Position[]): boolean {
  let inside = false;
  const n = vertices.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

export function getTerritoryAtPosition(pos: Position, territories: Territory[]): Territory | null {
  for (const t of territories) {
    if (isPointInPolygon(pos, t.vertices)) return t;
  }
  return null;
}
