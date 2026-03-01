import React from 'react';
import type { WinnerTeam } from '../types/game';
import { Button } from '@/components/ui/button';
import { RotateCcw, Home } from 'lucide-react';

interface GameOverScreenProps {
  winner: WinnerTeam;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export function GameOverScreen({ winner, onPlayAgain, onReturnToLobby }: GameOverScreenProps) {
  const isNativeWin = winner === 'NativePeoples';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sepia/70 backdrop-blur-sm">
      <div
        className="parchment-bg ornate-border rounded-sm p-8 max-w-md w-full mx-4 text-center animate-banner-in"
        style={{
          boxShadow: '0 0 0 4px oklch(0.65 0.07 65), 0 0 0 8px oklch(0.35 0.08 55), 0 20px 60px oklch(0.22 0.05 55 / 0.6)',
        }}
      >
        {/* Decorative top border */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-px flex-1 bg-sepia/40" />
          <span className="text-ochre text-lg">✦</span>
          <div className="h-px flex-1 bg-sepia/40" />
        </div>

        {/* Emblem */}
        <div className="flex justify-center mb-4">
          <img
            src={isNativeWin
              ? '/assets/generated/native-peoples-emblem.dim_256x256.png'
              : '/assets/generated/colonizers-emblem.dim_256x256.png'
            }
            alt={isNativeWin ? 'Povos Nativos' : 'Colonizadores'}
            className="w-24 h-24 object-contain"
          />
        </div>

        {/* Victory title */}
        <h2 className="period-title text-2xl font-bold mb-1" style={{
          color: isNativeWin ? 'oklch(0.42 0.14 145)' : 'oklch(0.38 0.16 25)',
        }}>
          {isNativeWin ? 'Vitória dos Povos Nativos!' : 'Vitória dos Colonizadores!'}
        </h2>

        <p className="font-fell italic text-sepia/70 text-sm mb-4">
          {isNativeWin
            ? 'As terras sagradas foram protegidas. Os ancestrais sorriem.'
            : 'O Novo Mundo foi conquistado. A bandeira dos colonizadores tremula.'
          }
        </p>

        {/* Decorative separator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-px flex-1 bg-sepia/30" />
          <span className="text-ochre/60 text-sm">⚜</span>
          <div className="h-px flex-1 bg-sepia/30" />
        </div>

        {/* Flavor text */}
        <div className="bg-parchment/60 rounded-sm p-3 mb-6 border border-sepia/20">
          <p className="font-fell text-xs text-sepia/70 italic">
            {isNativeWin
              ? '"Nossas terras, nosso sangue, nossa memória — nada pode apagar o que somos."'
              : '"Em nome da Coroa, estas terras agora pertencem ao Velho Mundo."'
            }
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={onPlayAgain}
            className="font-cinzel text-sm bg-sepia hover:bg-sepia/80 text-parchment px-5"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Jogar Novamente
          </Button>
          <Button
            onClick={onReturnToLobby}
            variant="outline"
            className="font-cinzel text-sm border-sepia/60 text-sepia hover:bg-sepia/10 px-5"
          >
            <Home className="w-4 h-4 mr-2" />
            Lobby
          </Button>
        </div>

        {/* Decorative bottom border */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-px flex-1 bg-sepia/40" />
          <span className="text-ochre text-lg">✦</span>
          <div className="h-px flex-1 bg-sepia/40" />
        </div>
      </div>
    </div>
  );
}
