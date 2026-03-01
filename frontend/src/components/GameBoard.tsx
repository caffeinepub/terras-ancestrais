import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { GameState, GameUnit, Territory, Position, TerrainType } from '../types/game';
import { getDistance, MAP_WIDTH, MAP_HEIGHT } from '../utils/gameInitializer';

interface GameBoardProps {
  gameState: GameState;
  onCanvasClick: (x: number, y: number) => void;
  selectedUnitId: string | null;
  isMovingMode: boolean;
}

const COLORS = {
  forestFill: 'rgba(34, 85, 34, 0.72)',
  forestStroke: '#1a4a1a',
  plainsFill: 'rgba(180, 150, 60, 0.72)',
  plainsStroke: '#8a6a20',
  hillsFill: 'rgba(140, 90, 50, 0.72)',
  hillsStroke: '#7a4a20',
  riverFill: 'rgba(40, 100, 180, 0.65)',
  riverStroke: '#1a4a8a',
  villageFill: 'rgba(160, 100, 40, 0.72)',
  villageStroke: '#7a4a10',
  fortFill: 'rgba(100, 80, 60, 0.72)',
  fortStroke: '#5a3a20',

  nativeTint: 'rgba(30, 100, 50, 0.35)',
  colonizerTint: 'rgba(140, 30, 30, 0.35)',
  neutralTint: 'rgba(0, 0, 0, 0)',

  nativeUnit: '#2d6e3a',
  nativeUnitLight: '#4a9a5a',
  colonizerUnit: '#8b2020',
  colonizerUnitLight: '#b84040',
  unitStroke: '#3a2010',
  selectedRing: '#d4af37',

  healthGreen: '#3a8a3a',
  healthYellow: '#c8a020',
  healthRed: '#cc3333',
  healthBg: '#3a2010',

  captureBar: '#8b2020',
  captureBarNative: '#2d6e3a',

  text: '#3a2010',
  textLight: '#f4e8d0',
  textShadow: 'rgba(0,0,0,0.6)',

  deadUnit: '#666',
  borderStroke: '#7a5c2e',
};

function getTerrainColors(terrain: TerrainType): { fill: string; stroke: string } {
  switch (terrain) {
    case 'forest':  return { fill: COLORS.forestFill,  stroke: COLORS.forestStroke };
    case 'plains':  return { fill: COLORS.plainsFill,  stroke: COLORS.plainsStroke };
    case 'hills':   return { fill: COLORS.hillsFill,   stroke: COLORS.hillsStroke };
    case 'river':   return { fill: COLORS.riverFill,   stroke: COLORS.riverStroke };
    case 'village': return { fill: COLORS.villageFill, stroke: COLORS.villageStroke };
    case 'fort':    return { fill: COLORS.fortFill,    stroke: COLORS.fortStroke };
    default:        return { fill: COLORS.plainsFill,  stroke: COLORS.plainsStroke };
  }
}

function getOwnershipTint(owner: string | null): string {
  if (owner === 'NativePeoples') return COLORS.nativeTint;
  if (owner === 'Colonizers') return COLORS.colonizerTint;
  return COLORS.neutralTint;
}

function getTerrainLabel(terrain: TerrainType): string {
  switch (terrain) {
    case 'forest':  return '🌲 Floresta';
    case 'plains':  return '🌾 Planície';
    case 'hills':   return '⛰ Colinas';
    case 'river':   return '🌊 Rio';
    case 'village': return '🛖 Aldeia';
    case 'fort':    return '🏰 Forte';
    default:        return '';
  }
}

function getTerrainIcon(terrain: TerrainType): string {
  switch (terrain) {
    case 'forest':  return '🌲';
    case 'plains':  return '🌾';
    case 'hills':   return '⛰';
    case 'river':   return '🌊';
    case 'village': return '🛖';
    case 'fort':    return '🏰';
    default:        return '';
  }
}

function drawRoughBorder(ctx: CanvasRenderingContext2D, verts: Position[], scale: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * scale;
  ctx.setLineDash([6 * scale, 3 * scale, 2 * scale, 3 * scale]);
  ctx.beginPath();
  ctx.moveTo(verts[0].x * scale, verts[0].y * scale);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x * scale, verts[i].y * scale);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawTerrainIcon(ctx: CanvasRenderingContext2D, territory: Territory, scale: number) {
  const cx = territory.center.x * scale;
  const cy = territory.center.y * scale;
  ctx.save();
  ctx.font = `${16 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.55;
  const icon = getTerrainIcon(territory.terrain);
  if (icon) {
    ctx.fillText(icon, cx, cy + 28 * scale);
    if (territory.terrain === 'forest') {
      ctx.fillText('🌲', cx - 18 * scale, cy + 22 * scale);
      ctx.fillText('🌲', cx + 18 * scale, cy + 22 * scale);
    }
  }
  ctx.restore();
}

function drawCaptureRipple(ctx: CanvasRenderingContext2D, territory: Territory, scale: number, time: number) {
  if (territory.captureProgress <= 0 || territory.captureProgress >= 100) return;
  const cx = territory.center.x * scale;
  const cy = territory.center.y * scale;
  const phase = (time % 1200) / 1200;
  const maxR = 35 * scale;
  for (let i = 0; i < 3; i++) {
    const ripplePhase = (phase + i / 3) % 1;
    const r = ripplePhase * maxR;
    const alpha = (1 - ripplePhase) * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = territory.capturingTeam === 'Colonizers'
      ? `rgba(180, 50, 50, ${alpha})`
      : `rgba(50, 150, 80, ${alpha})`;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }
}

function drawTerritory(ctx: CanvasRenderingContext2D, territory: Territory, scale: number, time: number) {
  const verts = territory.vertices;
  const { fill, stroke } = getTerrainColors(territory.terrain);

  ctx.beginPath();
  ctx.moveTo(verts[0].x * scale, verts[0].y * scale);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x * scale, verts[i].y * scale);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  const tint = getOwnershipTint(territory.owner);
  if (tint !== COLORS.neutralTint) {
    ctx.beginPath();
    ctx.moveTo(verts[0].x * scale, verts[0].y * scale);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x * scale, verts[i].y * scale);
    }
    ctx.closePath();
    ctx.fillStyle = tint;
    ctx.fill();
  }

  drawRoughBorder(ctx, verts, scale, stroke);
  drawTerrainIcon(ctx, territory, scale);

  // Strategic point indicator
  if (territory.isStrategicPoint) {
    const cx = territory.center.x * scale;
    const cy = (territory.center.y - 20) * scale;
    ctx.save();
    ctx.font = `${14 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9;
    ctx.fillText('⭐', cx, cy);
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = COLORS.textShadow;
  ctx.shadowBlur = 3 * scale;
  ctx.fillStyle = COLORS.textLight;
  ctx.font = `bold ${10 * scale}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(territory.name, territory.center.x * scale, (territory.center.y - 12) * scale);
  ctx.restore();

  const terrainLabel = getTerrainLabel(territory.terrain);
  ctx.save();
  ctx.font = `${7 * scale}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(244, 232, 208, 0.7)';
  ctx.fillText(terrainLabel, territory.center.x * scale, (territory.center.y + 30) * scale);
  ctx.restore();

  if (territory.captureProgress > 0 && territory.captureProgress < 100) {
    const barW = 60 * scale;
    const barH = 5 * scale;
    const barX = territory.center.x * scale - barW / 2;
    const barY = (territory.center.y + 5) * scale;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);

    const progressColor = territory.capturingTeam === 'Colonizers' ? COLORS.captureBar : COLORS.captureBarNative;
    ctx.fillStyle = progressColor;
    ctx.fillRect(barX, barY, barW * (territory.captureProgress / 100), barH);

    ctx.strokeStyle = COLORS.borderStroke;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);

    drawCaptureRipple(ctx, territory, scale, time);
  }

  const icon = territory.owner === 'NativePeoples' ? '🌿' : territory.owner === 'Colonizers' ? '⚔' : '◆';
  ctx.font = `${12 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.textLight;
  ctx.fillText(icon, territory.center.x * scale, (territory.center.y + 16) * scale);

  // Draw construction if present
  if (territory.construction) {
    const cx = territory.center.x * scale;
    const cy = (territory.center.y - 5) * scale;
    ctx.save();
    ctx.font = `${18 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9;
    ctx.fillText(territory.construction.type === 'tower' ? '🗼' : '🏰', cx + 20 * scale, cy);
    ctx.restore();
  }
}

function getClassIcon(classType: string): string {
  const icons: Record<string, string> = {
    ForestWarrior: '🪶',
    SpiritHunter: '🏹',
    Shaman: '🔮',
    Sentinel: '🛡',
    MusketSoldier: '🔫',
    Captain: '⚔',
    Engineer: '🔨',
    Missionary: '✝',
  };
  return icons[classType] || (classType.startsWith('Native') ? '🪶' : '✝');
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: GameUnit,
  scale: number,
  isSelected: boolean,
  isValidTarget: boolean,
  isHumanUnit: boolean,
  time: number
) {
  const x = unit.position.x * scale;
  const y = unit.position.y * scale;
  const r = 11 * scale;

  if (unit.health <= 0) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.deadUnit + '88';
    ctx.fill();
    ctx.fillStyle = COLORS.textLight;
    ctx.font = `${10 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✝', x, y);
    return;
  }

  // Pulsing highlight ring for human-controllable units
  if (isHumanUnit && !isSelected) {
    const pulseAlpha = 0.35 + 0.25 * Math.sin(time / 400);
    const pulseRadius = r + 6 * scale + 2 * scale * Math.sin(time / 400);
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = unit.team === 'NativePeoples'
      ? `rgba(80, 200, 100, ${pulseAlpha})`
      : `rgba(220, 100, 80, ${pulseAlpha})`;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
  }

  // Fortify shield aura
  if (unit.fortifyTurnsRemaining > 0) {
    const shieldPulse = 0.5 + 0.5 * Math.sin(time / 300);
    ctx.beginPath();
    ctx.arc(x, y, r + 7 * scale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212, 175, 55, ${0.15 + shieldPulse * 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(212, 175, 55, ${0.6 + shieldPulse * 0.3})`;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }

  // Morale debuff indicator
  if (unit.moraleTurnsRemaining > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 100, 50, 0.7)';
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Invisible indicator
  if (unit.isInvisible) {
    ctx.globalAlpha = 0.35;
  }

  // Selected ring
  if (isSelected) {
    const selPulse = 0.6 + 0.4 * Math.sin(time / 200);
    const selRadius = r + 6 * scale + 2 * scale * Math.sin(time / 200);
    ctx.beginPath();
    ctx.arc(x, y, selRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(212, 175, 55, ${selPulse})`;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r + 2 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 240, 100, 0.4)`;
    ctx.lineWidth = 5 * scale;
    ctx.stroke();
  }

  // Valid attack target ring
  if (isValidTarget) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = '#cc3333';
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Unit body
  const isNative = unit.team === 'NativePeoples';
  const baseColor = isNative ? COLORS.nativeUnit : COLORS.colonizerUnit;
  const lightColor = isNative ? COLORS.nativeUnitLight : COLORS.colonizerUnitLight;

  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, lightColor);
  grad.addColorStop(1, baseColor);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = COLORS.unitStroke;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // Damage flash overlay
  if (unit.flashTimer > 0) {
    const flashAlpha = (unit.flashTimer / 5) * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 50, 50, ${flashAlpha})`;
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  // Unit icon (class-based)
  ctx.font = `${11 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.textLight;
  ctx.fillText(getClassIcon(unit.classType), x, y);

  // Level badge
  if (unit.level > 1) {
    ctx.save();
    ctx.font = `bold ${7 * scale}px Cinzel, serif`;
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`L${unit.level}`, x + r * 0.8, y - r * 0.8);
    ctx.restore();
  }

  // Health bar
  const barW = 22 * scale;
  const barH = 3.5 * scale;
  const barX = x - barW / 2;
  const barY = y - r - 7 * scale;

  ctx.fillStyle = COLORS.healthBg;
  ctx.fillRect(barX, barY, barW, barH);

  const hpRatio = unit.health / unit.maxHealth;
  const hpColor = hpRatio > 0.6 ? COLORS.healthGreen : hpRatio > 0.3 ? COLORS.healthYellow : COLORS.healthRed;
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // XP bar
  const xpThresholds = [0, 100, 250];
  const nextThreshold = xpThresholds[Math.min(unit.level, xpThresholds.length - 1)];
  const prevThreshold = xpThresholds[Math.max(unit.level - 1, 0)];
  const xpRatio = nextThreshold > prevThreshold
    ? (unit.xp - prevThreshold) / (nextThreshold - prevThreshold)
    : 1;
  const xpBarY = barY - 4 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(barX, xpBarY, barW, 2.5 * scale);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(barX, xpBarY, barW * Math.min(1, xpRatio), 2.5 * scale);

  // Status icons
  let statusX = x + r + 2 * scale;
  const statusY = y - r;
  ctx.font = `${8 * scale}px serif`;
  if (unit.fortifyTurnsRemaining > 0) {
    ctx.fillText('🛡', statusX, statusY);
    statusX += 10 * scale;
  }
  if (unit.moraleTurnsRemaining > 0) {
    ctx.fillText('💔', statusX, statusY);
    statusX += 10 * scale;
  }
  if (unit.isInvisible) {
    ctx.fillText('👁', statusX, statusY);
  }
}

function drawMovementRange(ctx: CanvasRenderingContext2D, unit: GameUnit, scale: number, time: number) {
  const x = unit.position.x * scale;
  const y = unit.position.y * scale;
  const range = unit.movementRange * scale;

  const grad = ctx.createRadialGradient(x, y, 0, x, y, range);
  grad.addColorStop(0, 'rgba(212, 175, 55, 0.12)');
  grad.addColorStop(0.7, 'rgba(212, 175, 55, 0.07)');
  grad.addColorStop(1, 'rgba(212, 175, 55, 0)');

  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const borderAlpha = 0.4 + 0.2 * Math.sin(time / 300);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(212, 175, 55, ${borderAlpha})`;
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([6 * scale, 4 * scale]);
  ctx.lineDashOffset = -(time / 30) % 20;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGameElements(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  gameState: GameState,
  scale: number,
  selectedUnitId: string | null,
  isMovingMode: boolean,
  time: number
) {
  for (const territory of gameState.territories) {
    drawTerritory(ctx, territory, scale, time);
  }

  const selectedUnit = gameState.units.find(u => u.id === selectedUnitId);

  if (selectedUnit && !selectedUnit.hasMoved) {
    drawMovementRange(ctx, selectedUnit, scale, time);
  }

  for (const unit of gameState.units) {
    const isSelected = unit.id === selectedUnitId;
    const isValidTarget =
      selectedUnit !== undefined &&
      selectedUnit.id !== unit.id &&
      unit.team !== selectedUnit.team &&
      unit.health > 0 &&
      !unit.isInvisible &&
      getDistance(selectedUnit.position, unit.position) <= selectedUnit.attackRange;

    const isHumanUnit = !unit.isBot && unit.health > 0 && unit.team === gameState.currentTeam;

    drawUnit(ctx, unit, scale, isSelected, isValidTarget, isHumanUnit, time);
  }

  ctx.strokeStyle = COLORS.borderStroke;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
}

export function GameBoard({ gameState, onCanvasClick, selectedUnitId, isMovingMode }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const animFrameRef = useRef<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgLoadedRef = useRef(false);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const newScale = Math.min(containerW / MAP_WIDTH, 1);
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/generated/map-background-v2.dim_1200x800.png';
    img.onload = () => { bgImageRef.current = img; bgLoadedRef.current = true; };
    img.onerror = () => {
      const img2 = new Image();
      img2.src = '/assets/generated/map-background.dim_1200x800.png';
      img2.onload = () => { bgImageRef.current = img2; bgLoadedRef.current = true; };
      img2.onerror = () => { bgLoadedRef.current = true; };
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = MAP_WIDTH * scale;
    canvas.height = MAP_HEIGHT * scale;

    let running = true;

    function render(time: number) {
      if (!running || !canvas || !ctx) return;

      if (bgImageRef.current && bgLoadedRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#d4b896');
        grad.addColorStop(0.5, '#c8a96e');
        grad.addColorStop(1, '#b8956a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      drawGameElements(ctx, canvas, gameState, scale, selectedUnitId, isMovingMode, time);
      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, scale, selectedUnitId, isMovingMode]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;
    onCanvasClick(clickX, clickY);
  }, [onCanvasClick, scale]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`block mx-auto rounded-sm shadow-lg border-2 border-sepia ${isMovingMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
        style={{ width: `${MAP_WIDTH * scale}px`, height: `${MAP_HEIGHT * scale}px` }}
        tabIndex={0}
      />
    </div>
  );
}
