import React, { useState, useCallback, useEffect } from 'react';
import type { PlayerSlot } from '../types/game';
import { GameBoard } from '../components/GameBoard';
import { GameTimer } from '../components/GameTimer';
import { GameOverScreen } from '../components/GameOverScreen';
import { UnitActionPanel } from '../components/UnitActionPanel';
import { TerritoryLegend } from '../components/TerritoryLegend';
import { HelpOverlay } from '../components/HelpOverlay';
import { TalentSelectionModal } from '../components/TalentSelectionModal';
import { useGameEngine } from '../hooks/useGameEngine';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useCreateGameSession } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { SkipForward, Users, Volume2, VolumeX, HelpCircle } from 'lucide-react';

interface GamePageProps {
  players: PlayerSlot[];
  onReturnToLobby: () => void;
}

export function GamePage({ players, onReturnToLobby }: GamePageProps) {
  const [isMovingMode, setIsMovingMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const { mutate: createSession } = useCreateGameSession();

  const {
    gameState,
    selectedUnit,
    actionFeedback,
    handleCanvasClick,
    endTurn,
    deselectUnit,
    executeAbility,
    buildConstruction,
    destroyConstruction,
    applyTalentPath,
    isGameOver,
  } = useGameEngine(players);

  const {
    playUnitSelect,
    playUnitMove,
    playAttack,
    playCaptureStart,
    playCaptureComplete,
    playFortify,
    playMusketFire,
    playConstructionSound,
    playForestAmbient,
    stopForestAmbient,
    playTribalDrums,
    stopTribalDrums,
    playConquestDrone,
    stopConquestDrone,
    setMuted,
  } = useSoundEffects();

  // Sync sound enabled state
  useEffect(() => {
    setMuted(!soundEnabled);
  }, [soundEnabled, setMuted]);

  // Create backend session on mount
  useEffect(() => {
    const sessionId = `game-${Date.now()}`;
    createSession(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conquest drone sound
  useEffect(() => {
    if (gameState.conquestCountdown !== null) {
      playConquestDrone();
    } else {
      stopConquestDrone();
    }
  }, [gameState.conquestCountdown, playConquestDrone, stopConquestDrone]);

  // Tribal drums for native team
  useEffect(() => {
    if (gameState.currentTeam === 'NativePeoples' && soundEnabled) {
      playTribalDrums();
    } else {
      stopTribalDrums();
    }
    return () => stopTribalDrums();
  }, [gameState.currentTeam, soundEnabled, playTribalDrums, stopTribalDrums]);

  // Forest ambient for selected unit in forest
  useEffect(() => {
    if (selectedUnit) {
      const inForest = gameState.territories.some(t =>
        t.terrain === 'forest' &&
        isPointInPolygon(selectedUnit.position, t.vertices)
      );
      if (inForest && soundEnabled) {
        playForestAmbient();
      } else {
        stopForestAmbient();
      }
    } else {
      stopForestAmbient();
    }
  }, [selectedUnit, soundEnabled, playForestAmbient, stopForestAmbient, gameState.territories]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
        } else {
          deselectUnit();
          setIsMovingMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, deselectUnit]);

  const handleToggleMove = useCallback(() => {
    setIsMovingMode(prev => !prev);
  }, []);

  const handleBoardClick = useCallback((x: number, y: number) => {
    if (isMovingMode && selectedUnit && !selectedUnit.hasMoved) {
      setIsMovingMode(false);
      playUnitMove();
    }
    handleCanvasClick(x, y);
  }, [isMovingMode, selectedUnit, handleCanvasClick, playUnitMove]);

  const handleAttack = useCallback((targetId: string) => {
    if (!selectedUnit) return;
    if (selectedUnit.classType === 'MusketSoldier') {
      playMusketFire();
    } else {
      playAttack();
    }
    handleCanvasClick(
      gameState.units.find(u => u.id === targetId)?.position.x ?? 0,
      gameState.units.find(u => u.id === targetId)?.position.y ?? 0
    );
  }, [selectedUnit, handleCanvasClick, gameState.units, playAttack, playMusketFire]);

  const handleFortify = useCallback(() => {
    if (!selectedUnit) return;
    playFortify();
  }, [selectedUnit, playFortify]);

  const handleExecuteAbility = useCallback((abilityId: string, targetId?: string) => {
    if (!selectedUnit) return;
    if (abilityId === 'musket_fire') playMusketFire();
    if (abilityId === 'build') playConstructionSound();
    executeAbility(selectedUnit.id, abilityId, targetId);
  }, [selectedUnit, executeAbility, playMusketFire, playConstructionSound]);

  const handleBuild = useCallback((buildType: 'tower' | 'fortress') => {
    if (!selectedUnit) return;
    playConstructionSound();
    buildConstruction(selectedUnit.id, buildType);
  }, [selectedUnit, buildConstruction, playConstructionSound]);

  const handleDestroy = useCallback(() => {
    if (!selectedUnit) return;
    destroyConstruction(selectedUnit.id);
  }, [selectedUnit, destroyConstruction]);

  const handlePlayAgain = useCallback(() => {
    window.location.reload();
  }, []);

  // Determine if the current team has any human (non-bot) players
  const isHumanTurn = players.some(p => p.team === gameState.currentTeam && !p.isBot);

  // Pending talent selection
  const pendingTalentUnitId = gameState.pendingTalentSelections[0] ?? null;
  const pendingTalentUnit = pendingTalentUnitId
    ? gameState.units.find(u => u.id === pendingTalentUnitId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sepia/90 to-parchment/20 flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-sepia/40 bg-sepia/80 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src="/assets/generated/native-peoples-emblem.dim_256x256.png" alt="Nativos" className="w-8 h-8 object-contain" />
            <h1 className="font-cinzel text-lg text-ochre font-bold hidden sm:block">Terras do Século XVI</h1>
            <img src="/assets/generated/colonizers-emblem.dim_256x256.png" alt="Colonizadores" className="w-8 h-8 object-contain" />
          </div>

          <GameTimer
            timeRemaining={gameState.timeRemaining}
            conquestCountdown={gameState.conquestCountdown}
          />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHelp(true)}
              className="font-cinzel text-xs border-ochre/60 text-ochre hover:bg-ochre/10 h-7 gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajuda</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="font-cinzel text-xs text-parchment/60 hover:text-parchment h-7 w-7 p-0"
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <div className="flex items-center gap-1 text-xs font-fell text-parchment/70">
              <Users className="w-3 h-3" />
              <span>Turno {gameState.turnNumber}</span>
            </div>

            <div className="text-xs font-cinzel px-2 py-1 rounded border border-parchment/20 text-parchment/70">
              {gameState.currentTeam === 'NativePeoples' ? '🛖 Nativos' : '🏴‍☠️ Colonizadores'}
            </div>
          </div>
        </div>
      </header>

      {/* Main game area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 py-3 flex gap-3">
        {/* Game board */}
        <div className="flex-1 min-w-0">
          <GameBoard
            gameState={gameState}
            onCanvasClick={handleBoardClick}
            selectedUnitId={selectedUnit?.id ?? null}
            isMovingMode={isMovingMode}
          />

          {/* Instructions */}
          <div className="mt-2 text-center">
            {isMovingMode ? (
              <p className="font-fell italic text-xs text-ochre animate-pulse">
                🎯 Clique no mapa para mover — círculo amarelo mostra o alcance
              </p>
            ) : selectedUnit ? (
              <p className="font-fell italic text-xs text-parchment/60">
                Unidade selecionada — clique no inimigo para atacar, ou use o painel de ações
              </p>
            ) : (
              <p className="font-fell italic text-xs text-parchment/50">
                Clique em uma unidade com anel brilhante para selecioná-la • ESC para desselecionar
              </p>
            )}
          </div>

          {/* End Turn button — prominent, below the board */}
          <div className="mt-3 flex justify-center">
            <Button
              onClick={endTurn}
              disabled={!isHumanTurn || isGameOver}
              className={`
                font-cinzel font-bold text-sm uppercase tracking-widest
                px-8 py-3 h-auto
                border-2 border-sepia/70
                shadow-lg transition-all duration-150
                ${isHumanTurn && !isGameOver
                  ? 'bg-terracotta hover:bg-terracotta/80 active:scale-95 text-parchment cursor-pointer'
                  : 'bg-sepia/30 text-parchment/40 cursor-not-allowed border-sepia/30'
                }
              `}
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Finalizar Turno
            </Button>
          </div>

          {/* Terrain legend */}
          <div className="mt-2 flex justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 text-xs font-fell text-parchment/50">
              <span>🌲</span><span>Floresta: +15% Dano</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-fell text-parchment/50">
              <span>🌾</span><span>Planície: +10% Mosquete</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-fell text-parchment/50">
              <span>⛰</span><span>Colinas: +10% Ranged</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-fell text-parchment/50">
              <span>⭐</span><span>Ponto Estratégico</span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-52 flex-shrink-0 space-y-3">
          {/* Territory legend */}
          <TerritoryLegend gameState={gameState} />

          {/* Unit action panel */}
          <UnitActionPanel
            unit={selectedUnit}
            allUnits={gameState.units}
            territories={gameState.territories}
            onAttack={handleAttack}
            onFortify={handleFortify}
            onDeselect={deselectUnit}
            isMoving={isMovingMode}
            onToggleMove={handleToggleMove}
            actionFeedback={actionFeedback}
            onExecuteAbility={handleExecuteAbility}
            onBuild={handleBuild}
            onDestroy={handleDestroy}
          />

          {/* Units list */}
          <div className="bg-sepia/60 border border-parchment/20 rounded-lg p-3">
            <h3 className="font-cinzel text-xs font-bold text-ochre mb-2 uppercase tracking-wider">
              Unidades
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {gameState.units.map(unit => {
                const isNative = unit.team === 'NativePeoples';
                const isHuman = !unit.isBot;
                const isCurrentTeam = unit.team === gameState.currentTeam;
                return (
                  <button
                    key={unit.id}
                    onClick={() => {
                      if (unit.health > 0 && isHuman && isCurrentTeam) {
                        handleCanvasClick(unit.position.x, unit.position.y);
                        playUnitSelect();
                      }
                    }}
                    disabled={unit.health <= 0 || !isHuman || !isCurrentTeam}
                    className={`
                      w-full text-left px-2 py-1 rounded text-xs font-fell transition-colors
                      ${unit.isSelected ? 'bg-ochre/30 border border-ochre/40' : 'hover:bg-parchment/10'}
                      ${unit.health <= 0 ? 'opacity-40 line-through' : ''}
                      ${!isHuman ? 'opacity-60' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={isNative ? 'text-native-green' : 'text-colonizer-red'}>
                        {isNative ? '🛖' : '🏴‍☠️'} {unit.classType.slice(0, 8)}
                        {!isHuman && <span className="text-parchment/40 ml-1">(Bot)</span>}
                      </span>
                      <span className="text-parchment/60 flex items-center gap-0.5 text-xs">
                        {unit.level > 1 && <span className="text-ochre">L{unit.level}</span>}
                        {unit.fortifyTurnsRemaining > 0 && <span>🛡</span>}
                        {Math.round(unit.health)}hp
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Game Over Screen */}
      {isGameOver && gameState.winner && (
        <GameOverScreen
          winner={gameState.winner}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={onReturnToLobby}
        />
      )}

      {/* Talent Selection Modal */}
      {pendingTalentUnit && (
        <TalentSelectionModal
          unit={pendingTalentUnit}
          onSelectPath={applyTalentPath}
        />
      )}

      {/* Help Overlay */}
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}

      {/* Footer */}
      <footer className="text-center py-2 border-t border-parchment/10">
        <p className="font-fell text-xs text-parchment/30">
          © {new Date().getFullYear()} Terras do Século XVI — Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'terras-seculo-xvi')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ochre/60 hover:text-ochre transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

// Helper used in GamePage for forest ambient detection
function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
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
