import type { GameUnit, GameState, Territory, Position, PlayerSlot, Team, ClassType, ClassAbility, ClassStats, TerrainType, Construction } from '../types/game';

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

export const CLASS_BASE_STATS: Record<ClassType, ClassStats> = {
  ForestWarrior: { health: 120, attack: 25, movement: 100, attackRange: 60, defense: 15 },
  SpiritHunter:  { health: 90,  attack: 30, movement: 90,  attackRange: 120, defense: 10 },
  Shaman:        { health: 80,  attack: 15, movement: 80,  attackRange: 80,  defense: 12 },
  Sentinel:      { health: 150, attack: 20, movement: 70,  attackRange: 50,  defense: 25 },
  MusketSoldier: { health: 100, attack: 35, movement: 80,  attackRange: 130, defense: 12 },
  Captain:       { health: 110, attack: 22, movement: 85,  attackRange: 70,  defense: 18 },
  Engineer:      { health: 90,  attack: 15, movement: 75,  attackRange: 60,  defense: 14 },
  Missionary:    { health: 85,  attack: 12, movement: 80,  attackRange: 70,  defense: 10 },
};

export const CLASS_ABILITIES: Record<ClassType, ClassAbility[]> = {
  ForestWarrior: [
    { id: 'camouflage', name: 'Camuflagem', description: 'Fica invisível por 2 turnos', type: 'active', cooldown: 4, currentCooldown: 0 },
    { id: 'forest_bonus', name: 'Filho da Floresta', description: '+15% dano ao sair da floresta', type: 'passive', cooldown: 0, currentCooldown: 0 },
  ],
  SpiritHunter: [
    { id: 'mark_enemy', name: 'Marcar Inimigo', description: 'Marca um inimigo: +25% dano contra ele', type: 'active', cooldown: 3, currentCooldown: 0 },
    { id: 'trap', name: 'Armadilha Natural', description: 'Coloca armadilha no território atual', type: 'active', cooldown: 5, currentCooldown: 0 },
  ],
  Shaman: [
    { id: 'heal', name: 'Cura Espiritual', description: 'Restaura 30% do HP máximo de um aliado', type: 'active', cooldown: 3, currentCooldown: 0 },
    { id: 'weaken', name: 'Enfraquecimento', description: 'Reduz ataque inimigo em 30% por 2 turnos', type: 'active', cooldown: 4, currentCooldown: 0 },
  ],
  Sentinel: [
    { id: 'barricade', name: 'Barricada Natural', description: 'Constrói barricada defensiva', type: 'active', cooldown: 4, currentCooldown: 0 },
    { id: 'destroy', name: 'Destruir Construção', description: 'Destrói construção inimiga em 2 turnos', type: 'active', cooldown: 2, currentCooldown: 0 },
  ],
  MusketSoldier: [
    { id: 'musket_fire', name: 'Disparo de Mosquete', description: 'Alto dano, precisa recarregar no próximo turno', type: 'active', cooldown: 2, currentCooldown: 0 },
    { id: 'field_advantage', name: 'Vantagem em Campo', description: '+10% dano em campo aberto', type: 'passive', cooldown: 0, currentCooldown: 0 },
  ],
  Captain: [
    { id: 'formation_buff', name: 'Formação de Batalha', description: '+20% ataque/defesa para aliados adjacentes', type: 'active', cooldown: 3, currentCooldown: 0 },
    { id: 'rally', name: 'Reagrupar', description: 'Aliados próximos recuperam 15% HP', type: 'active', cooldown: 5, currentCooldown: 0 },
  ],
  Engineer: [
    { id: 'build', name: 'Construir', description: 'Constrói torre ou fortaleza', type: 'active', cooldown: 1, currentCooldown: 0 },
    { id: 'repair', name: 'Reparar', description: 'Repara construção aliada em 25 HP', type: 'active', cooldown: 3, currentCooldown: 0 },
  ],
  Missionary: [
    { id: 'heal_ally', name: 'Bênção', description: 'Cura aliado em 25% do HP máximo', type: 'active', cooldown: 3, currentCooldown: 0 },
    { id: 'pacify', name: 'Pacificar', description: 'Reduz ataque inimigo em 30% por 2 turnos', type: 'active', cooldown: 4, currentCooldown: 0 },
  ],
};

export const TALENT_PATHS: Record<ClassType, {
  PathA: { name: string; description: string; statBonuses: Partial<ClassStats>; abilityUpgrades: string[] };
  PathB: { name: string; description: string; statBonuses: Partial<ClassStats>; abilityUpgrades: string[] };
}> = {
  ForestWarrior: {
    PathA: { name: 'Caminho do Espírito', description: 'Mais mobilidade e furtividade', statBonuses: { movement: 20, defense: 5 }, abilityUpgrades: ['Camuflagem dura 3 turnos'] },
    PathB: { name: 'Caminho da Fúria', description: 'Mais dano e agressividade', statBonuses: { attack: 10, health: 20 }, abilityUpgrades: ['Bônus de floresta aumenta para +25%'] },
  },
  SpiritHunter: {
    PathA: { name: 'Caçador das Sombras', description: 'Furtividade e armadilhas aprimoradas', statBonuses: { movement: 15, attackRange: 20 }, abilityUpgrades: ['Armadilha causa dano adicional'] },
    PathB: { name: 'Arqueiro Espiritual', description: 'Dano à distância aumentado', statBonuses: { attack: 12, attackRange: 30 }, abilityUpgrades: ['Marca dura 3 turnos'] },
  },
  Shaman: {
    PathA: { name: 'Curandeiro Ancestral', description: 'Curas mais poderosas', statBonuses: { health: 20, defense: 8 }, abilityUpgrades: ['Cura restaura 45% HP'] },
    PathB: { name: 'Feiticeiro de Guerra', description: 'Debuffs mais eficazes', statBonuses: { attack: 8, movement: 10 }, abilityUpgrades: ['Enfraquecimento dura 3 turnos'] },
  },
  Sentinel: {
    PathA: { name: 'Guardião da Aldeia', description: 'Defesa máxima', statBonuses: { defense: 15, health: 30 }, abilityUpgrades: ['Barricada tem mais HP'] },
    PathB: { name: 'Destruidor', description: 'Especialista em demolição', statBonuses: { attack: 10, movement: 10 }, abilityUpgrades: ['Destruição em 1 turno'] },
  },
  MusketSoldier: {
    PathA: { name: 'Atirador de Elite', description: 'Precisão e alcance aumentados', statBonuses: { attackRange: 30, attack: 8 }, abilityUpgrades: ['Recarga mais rápida'] },
    PathB: { name: 'Soldado de Linha', description: 'Resistência em batalha', statBonuses: { health: 25, defense: 8 }, abilityUpgrades: ['Disparo em área'] },
  },
  Captain: {
    PathA: { name: 'Estrategista', description: 'Buffs de equipe aprimorados', statBonuses: { defense: 10, health: 20 }, abilityUpgrades: ['Formação dura 2 turnos'] },
    PathB: { name: 'Comandante de Assalto', description: 'Liderança ofensiva', statBonuses: { attack: 10, movement: 10 }, abilityUpgrades: ['Reagrupar cura mais HP'] },
  },
  Engineer: {
    PathA: { name: 'Mestre Construtor', description: 'Construções mais rápidas e resistentes', statBonuses: { health: 20, defense: 10 }, abilityUpgrades: ['Fortaleza constrói em 1 turno'] },
    PathB: { name: 'Sabotador', description: 'Especialista em destruição', statBonuses: { attack: 12, movement: 10 }, abilityUpgrades: ['Reparo restaura 50 HP'] },
  },
  Missionary: {
    PathA: { name: 'Curandeiro Sagrado', description: 'Curas em área', statBonuses: { health: 20, defense: 8 }, abilityUpgrades: ['Bênção cura aliados próximos também'] },
    PathB: { name: 'Diplomata de Guerra', description: 'Debuffs mais eficazes', statBonuses: { movement: 10, attackRange: 20 }, abilityUpgrades: ['Pacificar dura 3 turnos'] },
  },
};

export const XP_GAINS = {
  TERRITORY_DEFENSE: 5,
  TERRITORY_CAPTURE: 30,
  ASSIST_KILL: 15,
  ELIMINATE_ENEMY: 25,
};

function createTerritory(
  id: string,
  name: string,
  vertices: Position[],
  center: Position,
  owner: Team | null,
  terrain: TerrainType,
  isStrategicPoint: boolean,
  isElevated: boolean,
  isBuildable: boolean,
  adjacentIds: string[]
): Territory {
  return {
    id,
    name,
    vertices,
    center,
    owner,
    captureProgress: owner ? 100 : 0,
    capturingTeam: null,
    terrain,
    isStrategicPoint,
    isElevated,
    isBuildable,
    construction: null,
    adjacentIds,
    visibleToNatives: true,
    visibleToColonizers: true,
  };
}

export const INITIAL_TERRITORIES: Territory[] = [
  createTerritory(
    'village', 'Aldeia Principal',
    [{ x: 50, y: 50 }, { x: 220, y: 50 }, { x: 220, y: 200 }, { x: 50, y: 200 }],
    { x: 135, y: 125 },
    'NativePeoples', 'village', true, false, false,
    ['forest1', 'forest2']
  ),
  createTerritory(
    'forest1', 'Floresta Densa Norte',
    [{ x: 220, y: 50 }, { x: 420, y: 50 }, { x: 420, y: 220 }, { x: 220, y: 220 }],
    { x: 320, y: 135 },
    'NativePeoples', 'forest', false, false, false,
    ['village', 'forest2', 'hills1', 'river']
  ),
  createTerritory(
    'forest2', 'Floresta Sagrada',
    [{ x: 50, y: 200 }, { x: 220, y: 200 }, { x: 220, y: 400 }, { x: 50, y: 400 }],
    { x: 135, y: 300 },
    'NativePeoples', 'forest', false, false, false,
    ['village', 'forest3', 'river']
  ),
  createTerritory(
    'forest3', 'Floresta Profunda',
    [{ x: 50, y: 400 }, { x: 220, y: 400 }, { x: 220, y: 600 }, { x: 50, y: 600 }],
    { x: 135, y: 500 },
    'NativePeoples', 'forest', false, false, false,
    ['forest2', 'river', 'plains1']
  ),
  createTerritory(
    'hills1', 'Colinas Elevadas',
    [{ x: 420, y: 50 }, { x: 600, y: 50 }, { x: 600, y: 200 }, { x: 420, y: 200 }],
    { x: 510, y: 125 },
    null, 'hills', false, true, false,
    ['forest1', 'river', 'plains2']
  ),
  createTerritory(
    'river', 'Rio Estratégico',
    [{ x: 220, y: 220 }, { x: 600, y: 220 }, { x: 600, y: 380 }, { x: 220, y: 380 }],
    { x: 410, y: 300 },
    null, 'river', true, false, false,
    ['forest1', 'forest2', 'forest3', 'hills1', 'plains1', 'plains2', 'hills2']
  ),
  createTerritory(
    'plains1', 'Campos do Sul',
    [{ x: 220, y: 380 }, { x: 600, y: 380 }, { x: 600, y: 600 }, { x: 220, y: 600 }],
    { x: 410, y: 490 },
    null, 'plains', false, false, false,
    ['forest3', 'river', 'plains2', 'hills2']
  ),
  createTerritory(
    'hills2', 'Colinas do Leste',
    [{ x: 600, y: 380 }, { x: 800, y: 380 }, { x: 800, y: 600 }, { x: 600, y: 600 }],
    { x: 700, y: 490 },
    null, 'hills', false, true, false,
    ['river', 'plains1', 'plains2', 'plains3', 'fort']
  ),
  createTerritory(
    'plains2', 'Campos Abertos',
    [{ x: 600, y: 50 }, { x: 850, y: 50 }, { x: 850, y: 380 }, { x: 600, y: 380 }],
    { x: 725, y: 215 },
    null, 'plains', false, false, false,
    ['hills1', 'river', 'hills2', 'plains3', 'fort']
  ),
  createTerritory(
    'plains3', 'Planície Colonial',
    [{ x: 850, y: 200 }, { x: 1050, y: 200 }, { x: 1050, y: 600 }, { x: 850, y: 600 }],
    { x: 950, y: 400 },
    'Colonizers', 'plains', false, false, false,
    ['plains2', 'hills2', 'fort']
  ),
  createTerritory(
    'fort', 'Forte Colonial',
    [{ x: 1050, y: 50 }, { x: 1150, y: 50 }, { x: 1150, y: 750 }, { x: 1050, y: 750 }],
    { x: 1100, y: 400 },
    'Colonizers', 'fort', true, false, true,
    ['plains2', 'plains3', 'hills2']
  ),
];

function createUnit(
  id: string,
  team: Team,
  classType: ClassType,
  position: Position,
  isBot: boolean,
  playerId: string
): GameUnit {
  const stats = CLASS_BASE_STATS[classType];
  const abilities = CLASS_ABILITIES[classType].map(a => ({ ...a }));
  return {
    id,
    team,
    classType,
    position,
    health: stats.health,
    maxHealth: stats.health,
    attack: stats.attack,
    defense: stats.defense,
    movementRange: stats.movement,
    attackRange: stats.attackRange,
    isSelected: false,
    hasMoved: false,
    hasActed: false,
    isBot,
    playerId,
    fortifyTurnsRemaining: 0,
    moraleTurnsRemaining: 0,
    flashTimer: 0,
    xp: 0,
    level: 1,
    talentPath: null,
    abilities,
    isInvisible: false,
    invisibilityTurns: 0,
    markedEnemyId: null,
    attackDebuffTurns: 0,
    attackBuffTurns: 0,
    isReloading: false,
    isBuilding: false,
    isDestroying: null,
  };
}

export function getDistance(a: Position, b: Position): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function isPointInPolygon(point: Position, polygon: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getTerritoryAtPosition(territories: Territory[], pos: Position): Territory | null {
  for (const territory of territories) {
    if (isPointInPolygon(pos, territory.vertices)) {
      return territory;
    }
  }
  return null;
}

export function initializeUnits(players: PlayerSlot[]): GameUnit[] {
  const units: GameUnit[] = [];
  const nativePlayers = players.filter(p => p.team === 'NativePeoples');
  const colonizerPlayers = players.filter(p => p.team === 'Colonizers');

  const nativeSpawns: Position[] = [
    { x: 100, y: 100 }, { x: 160, y: 100 },
    { x: 100, y: 160 }, { x: 160, y: 160 },
  ];
  const colonizerSpawns: Position[] = [
    { x: 1070, y: 200 }, { x: 1120, y: 200 },
    { x: 1070, y: 280 }, { x: 1120, y: 280 },
  ];

  nativePlayers.forEach((player, index) => {
    const spawn = nativeSpawns[index % nativeSpawns.length];
    units.push(createUnit(`unit_${player.id}`, 'NativePeoples', player.class, { ...spawn }, player.isBot, player.id));
  });

  colonizerPlayers.forEach((player, index) => {
    const spawn = colonizerSpawns[index % colonizerSpawns.length];
    units.push(createUnit(`unit_${player.id}`, 'Colonizers', player.class, { ...spawn }, player.isBot, player.id));
  });

  return units;
}

export function initializeGameState(players: PlayerSlot[]): GameState {
  const territories = INITIAL_TERRITORIES.map(t => ({ ...t }));
  const units = initializeUnits(players);
  return {
    territories,
    units,
    currentTeam: 'NativePeoples',
    turnNumber: 1,
    timeRemaining: 300,
    gameOver: false,
    winner: null,
    constructions: [],
    conquestCountdown: null,
    pendingTalentSelections: [],
  };
}
