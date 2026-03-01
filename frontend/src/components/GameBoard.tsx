import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { GameState, GameUnit, Territory, Position } from '../types/game';
import { getDistance } from '../utils/gameInitializer';

interface GameBoardProps {
  gameState: GameState;
  onSelectUnit: (unitId: string | null) => void;
  onMoveUnit: (unitId: string, pos: Position) => void;
  isMovingMode: boolean;
  selectedUnitId: string | null;
}

// Color constants for canvas (cannot use CSS variables)
const COLORS = {
  neutral: '#c8a96e',
  neutralStroke: '#7a5c2e',
  native: '#2d6e3a',
  nativeStroke: '#1a4a24',
  colonizer: '#8b2020',
  colonizerStroke: '#5a1010',
  nativeUnit: '#2d6e3a',
  colonizerUnit: '#8b2020',
  unitStroke: '#3a2010',
  selectedRing: '#d4af37',
  healthGreen: '#3a8a3a',
  healthRed: '#cc3333',
  healthBg: '#3a2010',
  captureBar: '#8b2020',
  captureBarNative: '#2d6e3a',
  moveRange: 'rgba(212, 175, 55, 0.15)',
  moveRangeStroke: 'rgba(212, 175, 55, 0.6)',
  text: '#3a2010',
  textLight: '#f4e8d0',
  fortified: '#d4af37',
  deadUnit: '#666',
};

function getTerritoryColor(territory: Territory): { fill: string; stroke: string } {
  switch (territory.owner) {
    case 'NativePeoples':
      return { fill: COLORS.native, stroke: COLORS.nativeStroke };
    case 'Colonizers':
      return { fill: COLORS.colonizer, stroke: COLORS.colonizerStroke };
    default:
      return { fill: COLORS.neutral, stroke: COLORS.neutralStroke };
  }
}

function drawTerritory(ctx: CanvasRenderingContext2D, territory: Territory, scale: number) {
  const { fill, stroke } = getTerritoryColor(territory);
  const verts = territory.vertices;

  ctx.beginPath();
  ctx.moveTo(verts[0].x * scale, verts[0].y * scale);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x * scale, verts[i].y * scale);
  }
  ctx.closePath();

  ctx.fillStyle = fill + 'cc';
  ctx.fill();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = COLORS.textLight;
  ctx.font = `bold ${10 * scale}px Cinzel, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(territory.name, territory.center.x * scale, (territory.center.y - 12) * scale);

  if (territory.captureProgress > 0 && territory.captureProgress < 100) {
    const barW = 60 * scale;
    const barH = 5 * scale;
    const barX = territory.center.x * scale - barW / 2;
    const barY = (territory.center.y + 5) * scale;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(barX, barY, barW, barH);

    const progressColor = territory.owner === 'Colonizers' ? COLORS.captureBar : COLORS.captureBarNative;
    ctx.fillStyle = progressColor;
    ctx.fillRect(barX, barY, barW * (territory.captureProgress / 100), barH);

    ctx.strokeStyle = COLORS.neutralStroke;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  const icon = territory.owner === 'NativePeoples' ? '🌿' : territory.owner === 'Colonizers' ? '⚔' : '◆';
  ctx.font = `${12 * scale}px serif`;
  ctx.fillText(icon, territory.center.x * scale, (territory.center.y + 16) * scale);
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: GameUnit, scale: number, isSelected: boolean, isValidTarget: boolean) {
  const x = unit.position.x * scale;
  const y = unit.position.y * scale;
  const r = 10 * scale;

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

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.selectedRing;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
  }

  if (isValidTarget) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = '#cc3333';
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const unitColor = unit.team === 'NativePeoples' ? COLORS.nativeUnit : COLORS.colonizerUnit;
  ctx.fillStyle = unitColor;
  ctx.fill();
  ctx.strokeStyle = COLORS.unitStroke;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  if (unit.isFortified) {
    ctx.beginPath();
    ctx.arc(x, y, r + 2 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.fortified;
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([2 * scale, 2 * scale]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.font = `${11 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.textLight;
  ctx.fillText(unit.team === 'NativePeoples' ? '🏹' : '⚔', x, y);

  const barW = 20 * scale;
  const barH = 3 * scale;
  const barX = x - barW / 2;
  const barY = y - r - 6 * scale;

  ctx.fillStyle = COLORS.healthBg;
  ctx.fillRect(barX, barY, barW, barH);

  const hpRatio = unit.health / unit.maxHealth;
  ctx.fillStyle = hpRatio > 0.5 ? COLORS.healthGreen : COLORS.healthRed;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
}

function drawGameElements(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  gameState: GameState,
  scale: number,
  selectedUnitId: string | null,
  isMovingMode: boolean
) {
  for (const territory of gameState.territories) {
    drawTerritory(ctx, territory, scale);
  }

  const selectedUnit = gameState.units.find(u => u.id === selectedUnitId);

  if (selectedUnit && isMovingMode && !selectedUnit.hasMoved) {
    ctx.beginPath();
    ctx.arc(
      selectedUnit.position.x * scale,
      selectedUnit.position.y * scale,
      selectedUnit.movementRange * scale,
      0, Math.PI * 2
    );
    ctx.fillStyle = COLORS.moveRange;
    ctx.fill();
    ctx.strokeStyle = COLORS.moveRangeStroke;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const unit of gameState.units) {
    const isSelected = unit.id === selectedUnitId;
    const isValidTarget =
      !isMovingMode &&
      selectedUnit !== undefined &&
      selectedUnit.id !== unit.id &&
      unit.team !== selectedUnit.team &&
      unit.health > 0 &&
      getDistance(selectedUnit.position, unit.position) <= 80;

    drawUnit(ctx, unit, scale, isSelected, isValidTarget);
  }

  ctx.strokeStyle = COLORS.neutralStroke;
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
}

export function GameBoard({
  gameState,
  onSelectUnit,
  onMoveUnit,
  isMovingMode,
  selectedUnitId,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const newScale = Math.min(containerW / gameState.mapWidth, 1);
      setScale(newScale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [gameState.mapWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture non-null canvas reference for use in nested callbacks
    const canvasEl: HTMLCanvasElement = canvas;

    canvasEl.width = gameState.mapWidth * scale;
    canvasEl.height = gameState.mapHeight * scale;

    const img = new Image();
    img.src = '/assets/generated/map-background.dim_1200x800.png';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
      drawGameElements(ctx, canvasEl, gameState, scale, selectedUnitId, isMovingMode);
    };
    img.onerror = () => {
      const grad = ctx.createLinearGradient(0, 0, canvasEl.width, canvasEl.height);
      grad.addColorStop(0, '#d4b896');
      grad.addColorStop(0.5, '#c8a96e');
      grad.addColorStop(1, '#b8956a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      drawGameElements(ctx, canvasEl, gameState, scale, selectedUnitId, isMovingMode);
    };
  }, [gameState, scale, selectedUnitId, isMovingMode]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;
    const clickPos: Position = { x: clickX, y: clickY };

    if (isMovingMode && selectedUnitId) {
      onMoveUnit(selectedUnitId, clickPos);
      return;
    }

    const clickedUnit = gameState.units.find(u => {
      if (u.health <= 0) return false;
      return getDistance(u.position, clickPos) <= 12;
    });

    if (clickedUnit) {
      if (clickedUnit.id === selectedUnitId) {
        onSelectUnit(null);
      } else {
        onSelectUnit(clickedUnit.id);
      }
    } else {
      onSelectUnit(null);
    }
  }, [gameState.units, isMovingMode, selectedUnitId, onMoveUnit, onSelectUnit, scale]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`
          block mx-auto rounded-sm shadow-parchment border-2 border-sepia
          ${isMovingMode ? 'cursor-crosshair' : 'cursor-pointer'}
        `}
        style={{
          width: `${gameState.mapWidth * scale}px`,
          height: `${gameState.mapHeight * scale}px`,
        }}
        tabIndex={0}
      />
    </div>
  );
}
