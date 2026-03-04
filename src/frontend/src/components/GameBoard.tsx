import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type { GameState } from "../types/game";

interface GameBoardProps {
  gameState: GameState;
  onCanvasClick: (x: number, y: number) => void;
  selectedUnitId: string | null;
  reachablePositions: Array<{ x: number; y: number }>;
  attackableUnitIds: string[];
}

const CANVAS_W = 1200;
const CANVAS_H = 780;

export default function GameBoard({
  gameState,
  onCanvasClick,
  selectedUnitId,
  reachablePositions,
  attackableUnitIds,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const tickRef = useRef<number>(0);

  // Cache the background image so it's only loaded once
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/generated/map-background-v2.dim_1200x800.png";
    bgImgRef.current = img;
  }, []);

  // Keep latest props in refs so drawGame never needs to be recreated
  const gameStateRef = useRef(gameState);
  const selectedUnitIdRef = useRef(selectedUnitId);
  const reachablePositionsRef = useRef(reachablePositions);
  const attackableUnitIdsRef = useRef(attackableUnitIds);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    selectedUnitIdRef.current = selectedUnitId;
  }, [selectedUnitId]);
  useEffect(() => {
    reachablePositionsRef.current = reachablePositions;
  }, [reachablePositions]);
  useEffect(() => {
    attackableUnitIdsRef.current = attackableUnitIds;
  }, [attackableUnitIds]);

  // drawGame reads from refs — never changes identity, so the animation loop never restarts
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gs = gameStateRef.current;
    const selId = selectedUnitIdRef.current;
    const reachable = reachablePositionsRef.current;
    const attackable = attackableUnitIdsRef.current;

    tickRef.current += 1;
    const tick = tickRef.current;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image (cached)
    const bgImg = bgImgRef.current;
    if (bgImg?.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#8B7355";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw territories using actual pixel coordinates (vertices & center are in pixel space)
    for (const territory of gs.territories) {
      const verts = territory.vertices;
      if (!verts || verts.length < 3) continue;

      // Terrain base color overlay
      let terrainColor = "rgba(180,160,100,0.25)";
      if (territory.terrain === "forest") terrainColor = "rgba(34,85,34,0.30)";
      else if (territory.terrain === "hills")
        terrainColor = "rgba(120,100,60,0.35)";
      else if (territory.terrain === "plains")
        terrainColor = "rgba(200,180,100,0.20)";
      else if (territory.terrain === "river")
        terrainColor = "rgba(60,100,180,0.25)";
      else if (territory.terrain === "fort")
        terrainColor = "rgba(100,80,60,0.35)";
      else if (territory.terrain === "village")
        terrainColor = "rgba(180,140,80,0.30)";

      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) {
        ctx.lineTo(verts[i].x, verts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = terrainColor;
      ctx.fill();

      // Ownership tint
      if (territory.owner === "Colonizers") {
        ctx.fillStyle = "rgba(180,60,60,0.18)";
        ctx.fill();
      } else if (territory.owner === "NativePeoples") {
        ctx.fillStyle = "rgba(34,120,34,0.18)";
        ctx.fill();
      }

      // Territory border
      ctx.strokeStyle = "rgba(80,60,30,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Territory name at center
      const cx = territory.center.x;
      const cy = territory.center.y;
      ctx.fillStyle = "rgba(40,20,0,0.75)";
      ctx.font = "bold 9px serif";
      ctx.textAlign = "center";
      ctx.fillText(territory.name.substring(0, 12), cx, cy + 4);

      // Strategic point indicator
      if (territory.isStrategicPoint) {
        ctx.font = "14px serif";
        ctx.fillText("⭐", cx, cy - 10);
      }

      // Capture progress bar (if being contested)
      if (territory.captureProgress > 0 && territory.captureProgress < 100) {
        const barW = 60;
        const barH = 5;
        const bx = cx - barW / 2;
        const by = cy + 10;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(bx, by, barW, barH);
        const fillColor =
          territory.capturingTeam === "Colonizers" ? "#B22222" : "#228B22";
        ctx.fillStyle = fillColor;
        ctx.fillRect(bx, by, barW * (territory.captureProgress / 100), barH);
      }
    }

    // Draw movement range — single outer ring around selected unit
    if (reachable.length > 0 && selId) {
      const selectedUnit = gs.units.find((u) => u.id === selId);
      if (selectedUnit && !selectedUnit.hasMoved) {
        const pulse = 0.55 + 0.35 * Math.sin(tick * 0.1);
        ctx.beginPath();
        ctx.arc(
          selectedUnit.position.x,
          selectedUnit.position.y,
          selectedUnit.movementRange,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(80,160,255,${pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // Draw attackable unit tiles — pixel positions, draw as red circles around enemy
    for (const uid of attackable) {
      const unit = gs.units.find((u) => u.id === uid);
      if (!unit) continue;
      const pulse = 0.4 + 0.25 * Math.sin(tick * 0.12 + Math.PI);
      ctx.beginPath();
      ctx.arc(unit.position.x, unit.position.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,60,60,${pulse})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,80,80,0.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw units — positions are in pixel space
    for (const unit of gs.units) {
      if (unit.health <= 0) continue;
      const ux = unit.position.x;
      const uy = unit.position.y;

      const isSelected = unit.id === selId;
      const isColonizer = unit.team === "Colonizers";

      // Flash effect
      if (unit.flashTimer && unit.flashTimer > 0) {
        ctx.beginPath();
        ctx.arc(ux, uy, 22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,50,50,0.55)";
        ctx.fill();
      }

      // Selection ring (animated)
      if (isSelected) {
        const selPulse = 0.7 + 0.3 * Math.sin(tick * 0.15);
        ctx.beginPath();
        ctx.arc(ux, uy, 26, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,215,0,${selPulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Unit circle (team color)
      ctx.beginPath();
      ctx.arc(ux, uy, 18, 0, Math.PI * 2);
      ctx.fillStyle = isColonizer ? "#8B1A1A" : "#1A5C1A";
      ctx.fill();
      ctx.strokeStyle = isSelected
        ? "#FFD700"
        : isColonizer
          ? "#5C0A0A"
          : "#0A3C0A";
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Unit emoji / class icon
      const unitEmoji: Record<string, string> = {
        MusketSoldier: "🔫",
        Captain: "⚔️",
        Engineer: "🔧",
        Missionary: "✝️",
        ForestWarrior: "🏹",
        Shaman: "🌿",
        SpiritHunter: "👁️",
        Sentinel: "🛡️",
      };
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.fillText(unitEmoji[unit.classType] || "⚔", ux, uy + 5);

      // Bot indicator (small robot icon top-right of circle)
      if (unit.isBot) {
        ctx.font = "9px serif";
        ctx.fillStyle = "rgba(255,255,200,0.9)";
        ctx.fillText("🤖", ux + 14, uy - 10);
      }

      // Invisible indicator
      if (unit.isInvisible) {
        ctx.beginPath();
        ctx.arc(ux, uy, 20, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,200,255,0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // HP bar below unit
      const hpRatio = unit.health / unit.maxHealth;
      const barW = 32;
      const barH = 4;
      const bx = ux - barW / 2;
      const by = uy + 21;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle =
        hpRatio > 0.5 ? "#4CAF50" : hpRatio > 0.25 ? "#FF9800" : "#F44336";
      ctx.fillRect(bx, by, barW * hpRatio, barH);

      // Level indicator
      if (unit.level > 1) {
        ctx.font = "bold 9px serif";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText(`L${unit.level}`, ux - 16, uy - 10);
      }
    }

    // Legend bar at bottom
    ctx.fillStyle = "rgba(30,15,0,0.72)";
    ctx.fillRect(4, canvas.height - 26, 380, 22);
    ctx.font = "9px serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,230,150,0.95)";
    ctx.fillText(
      "👣 Mover  ⚔️ Atacar  🏹 Guerreiro  🌿 Xamã  🔫 Mosqueteiro  ⚔ Capitão  🔧 Engenheiro  ✝ Missionário",
      8,
      canvas.height - 10,
    );
  }, []); // stable — reads from refs

  // Animation loop — starts once and never restarts
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      drawGame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawGame]);

  // Click handler: pass raw pixel coordinates to the game engine
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);
      onCanvasClick(x, y);
    },
    [onCanvasClick],
  );

  return (
    <div className="relative w-full overflow-auto">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block cursor-pointer border-2 border-sepia-700 shadow-2xl"
        onClick={handleCanvasClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            const syntheticClick = new MouseEvent("click", {
              bubbles: true,
              clientX: 0,
              clientY: 0,
            });
            e.currentTarget.dispatchEvent(syntheticClick);
          }
        }}
        tabIndex={0}
        style={{ imageRendering: "pixelated", maxWidth: "100%" }}
      />
    </div>
  );
}
