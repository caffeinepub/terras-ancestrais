import React, { useState, useCallback, useEffect } from 'react';
import type { PlayerSlot, Position } from '../types/game';
import { GameBoard } from '../components/GameBoard';
import { GameTimer } from '../components/GameTimer';
import { GameOverScreen } from '../components/GameOverScreen';
import { UnitActionPanel } from '../components/UnitActionPanel';
import { TerritoryLegend } from '../components/TerritoryLegend';
import { useGameEngine } from '../hooks/useGameEngine';
import { useCreateGameSession } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { SkipForward, Users } from 'lucide-react';

interface GamePageProps {
  players: PlayerSlot[];
  onReturnToLobby: () => void;
}

export function GamePage({ players, onReturnToLobby }: GamePageProps) {
  const [isMovingMode, setIsMovingMode] = useState(false);
  const { mutate: createSession } = useCreateGameSession();

  const {
    gameState,
    initGame,
    moveUnit,
    attackUnit,
    fortifyUnit,
    selectUnit,
    endTurn,
    resetGame,
  } = useGameEngine();

  // Initialize game on mount
  useEffect(() => {
    const sessionId = `game-${Date.now()}`;
    createSession(sessionId, {
      onSettled: () => {
        initGame(players, sessionId);
      },
    });
  }, []);

  const selectedUnit = gameState?.units.find(u => u.isSelected) ?? null;

  const handleSelectUnit = useCallback((unitId: string | null) => {
    selectUnit(unitId);
    if (!unitId) setIsMovingMode(false);
  }, [selectUnit]);

  const handleMoveUnit = useCallback((unitId: string, pos: Position) => {
    moveUnit(unitId, pos);
    setIsMovingMode(false);
  }, [moveUnit]);

  const handleAttack = useCallback((targetId: string) => {
    if (!selectedUnit) return;
    attackUnit(selectedUnit.id, targetId);
  }, [selectedUnit, attackUnit]);

  const handleFortify = useCallback(() => {
    if (!selectedUnit) return;
    fortifyUnit(selectedUnit.id);
  }, [selectedUnit, fortifyUnit]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    const sessionId = `game-${Date.now()}`;
    createSession(sessionId, {
      onSettled: () => {
        initGame(players, sessionId);
      },
    });
  }, [players, resetGame, initGame, createSession]);

  const handleToggleMove = useCallback(() => {
    setIsMovingMode(prev => !prev);
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-screen parchment-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse-glow text-4xl mb-4">⚔</div>
          <p className="font-cinzel text-sepia text-lg">Preparando a batalha...</p>
        </div>
      </div>
    );
  }

  // Player info for current turn display
  const humanPlayers = players.filter(p => p.type === 'Player');

  return (
    <div className="min-h-screen parchment-bg flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-sepia/40 bg-parchment/90 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/native-peoples-emblem.dim_256x256.png"
              alt="Nativos"
              className="w-8 h-8 object-contain"
            />
            <h1 className="period-title text-lg text-sepia font-bold hidden sm:block">
              Terras Ancestrais
            </h1>
            <img
              src="/assets/generated/colonizers-emblem.dim_256x256.png"
              alt="Colonizadores"
              className="w-8 h-8 object-contain"
            />
          </div>

          <GameTimer timeRemaining={gameState.timeRemaining} />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-fell text-sepia/70">
              <Users className="w-3 h-3" />
              <span>Turno {gameState.currentTurn}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={endTurn}
              className="font-cinzel text-xs border-sepia/60 text-sepia hover:bg-sepia/10 h-7"
            >
              <SkipForward className="w-3 h-3 mr-1" />
              Fim do Turno
            </Button>
          </div>
        </div>
      </header>

      {/* Main game area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 py-3 flex gap-3">
        {/* Game board */}
        <div className="flex-1 min-w-0">
          <GameBoard
            gameState={gameState}
            onSelectUnit={handleSelectUnit}
            onMoveUnit={handleMoveUnit}
            isMovingMode={isMovingMode}
            selectedUnitId={selectedUnit?.id ?? null}
          />

          {/* Instructions */}
          <div className="mt-2 text-center">
            {isMovingMode ? (
              <p className="font-fell italic text-xs text-ochre animate-pulse-glow">
                🎯 Clique no mapa para mover a unidade selecionada
              </p>
            ) : selectedUnit ? (
              <p className="font-fell italic text-xs text-sepia/60">
                Unidade selecionada — use o painel de ações à direita
              </p>
            ) : (
              <p className="font-fell italic text-xs text-sepia/50">
                Clique em uma unidade para selecioná-la
              </p>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-52 flex-shrink-0 space-y-3">
          {/* Territory legend */}
          <TerritoryLegend territories={gameState.territories} />

          {/* Unit action panel */}
          {selectedUnit && (
            <UnitActionPanel
              unit={selectedUnit}
              allUnits={gameState.units}
              territories={gameState.territories}
              onAttack={handleAttack}
              onFortify={handleFortify}
              onDeselect={() => handleSelectUnit(null)}
              isMoving={isMovingMode}
              onToggleMove={handleToggleMove}
            />
          )}

          {/* Players list */}
          <div className="ornate-border rounded-sm p-3 bg-parchment/80">
            <h3 className="font-cinzel text-xs font-bold text-sepia mb-2 uppercase tracking-wider">
              Unidades
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {gameState.units.map(unit => {
                const player = players.find(p => p.id === unit.playerId);
                const isNative = unit.team === 'NativePeoples';
                return (
                  <button
                    key={unit.id}
                    onClick={() => handleSelectUnit(unit.health > 0 ? unit.id : null)}
                    className={`
                      w-full text-left px-2 py-1 rounded-sm text-xs font-fell transition-colors
                      ${unit.id === selectedUnit?.id ? 'bg-ochre/30' : 'hover:bg-parchment/60'}
                      ${unit.health <= 0 ? 'opacity-40 line-through' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={isNative ? 'text-native-green' : 'text-colonizer-red'}>
                        {isNative ? '🏹' : '⚔️'} {player?.name || `P${unit.playerId}`}
                      </span>
                      <span className="text-sepia/60">{Math.round(unit.health)}hp</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Game Over Screen */}
      {gameState.status === 'gameover' && gameState.winner && (
        <GameOverScreen
          winner={gameState.winner}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={onReturnToLobby}
        />
      )}

      {/* Footer */}
      <footer className="text-center py-2 border-t border-sepia/20">
        <p className="font-fell text-xs text-sepia/40">
          © {new Date().getFullYear()} — Built with{' '}
          <span className="text-terracotta">♥</span> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'terras-ancestrais')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ochre hover:text-ochre/80 underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
