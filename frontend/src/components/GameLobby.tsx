import React, { useState } from 'react';
import type { PlayerSlot, Team } from '../types/game';
import { PlayerSlotCard } from './PlayerSlotCard';
import { Button } from '@/components/ui/button';
import { Sword, Shield, Users } from 'lucide-react';

interface GameLobbyProps {
  onStartGame: (players: PlayerSlot[]) => void;
}

function createDefaultSlots(): PlayerSlot[] {
  return [
    { id: 1, name: 'Guerreiro Nativo 1', type: 'Player', team: 'NativePeoples' },
    { id: 2, name: 'Guerreiro Nativo 2', type: 'Bot', team: 'NativePeoples' },
    { id: 3, name: 'Guerreiro Nativo 3', type: 'Bot', team: 'NativePeoples' },
    { id: 4, name: 'Guerreiro Nativo 4', type: 'Bot', team: 'NativePeoples' },
    { id: 5, name: 'Conquistador 1', type: 'Player', team: 'Colonizers' },
    { id: 6, name: 'Conquistador 2', type: 'Bot', team: 'Colonizers' },
    { id: 7, name: 'Conquistador 3', type: 'Bot', team: 'Colonizers' },
    { id: 8, name: 'Conquistador 4', type: 'Bot', team: 'Colonizers' },
  ];
}

export function GameLobby({ onStartGame }: GameLobbyProps) {
  const [players, setPlayers] = useState<PlayerSlot[]>(createDefaultSlots);

  const nativePlayers = players.filter(p => p.team === 'NativePeoples');
  const colonizerPlayers = players.filter(p => p.team === 'Colonizers');

  const isBalanced = nativePlayers.length === 4 && colonizerPlayers.length === 4;
  const allNamed = players.every(p => p.name.trim().length > 0);
  const canStart = isBalanced && allNamed;

  const updateSlot = (updated: PlayerSlot) => {
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  return (
    <div className="min-h-screen parchment-bg flex flex-col">
      {/* Header */}
      <header className="text-center py-8 px-4 border-b-2 border-sepia/40">
        <div className="flex items-center justify-center gap-4 mb-3">
          <img
            src="/assets/generated/native-peoples-emblem.dim_256x256.png"
            alt="Povos Nativos"
            className="w-14 h-14 object-contain opacity-90"
          />
          <div>
            <h1 className="period-title text-3xl md:text-4xl text-sepia font-bold tracking-wide">
              Terras Ancestrais
            </h1>
            <p className="font-fell italic text-sepia/70 text-sm mt-1">
              Século XVI — A Batalha pelo Novo Mundo
            </p>
          </div>
          <img
            src="/assets/generated/colonizers-emblem.dim_256x256.png"
            alt="Colonizadores"
            className="w-14 h-14 object-contain opacity-90"
          />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* Balance indicator */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-sm border-2 ${
            nativePlayers.length === 4 ? 'border-native-green bg-native-green/10' : 'border-ochre bg-ochre/10'
          }`}>
            <Shield className="w-4 h-4 text-native-green" />
            <span className="font-cinzel text-sm text-sepia">
              Povos Nativos: <strong>{nativePlayers.length}/4</strong>
            </span>
          </div>
          <div className="font-cinzel text-sepia/50 text-lg">VS</div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-sm border-2 ${
            colonizerPlayers.length === 4 ? 'border-colonizer-red bg-colonizer-red/10' : 'border-ochre bg-ochre/10'
          }`}>
            <Sword className="w-4 h-4 text-colonizer-red" />
            <span className="font-cinzel text-sm text-sepia">
              Colonizadores: <strong>{colonizerPlayers.length}/4</strong>
            </span>
          </div>
        </div>

        {!isBalanced && (
          <p className="text-center font-fell italic text-terracotta text-sm mb-4">
            ⚠ Os times devem ter exatamente 4 jogadores cada
          </p>
        )}

        {/* Teams grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Native Peoples */}
          <div className="ornate-border rounded-sm p-4 bg-parchment/60">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/assets/generated/native-peoples-emblem.dim_256x256.png"
                alt="Povos Nativos"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h2 className="font-cinzel text-lg font-bold text-native-green">Povos Nativos</h2>
                <p className="font-fell italic text-xs text-sepia/60">Defensores das Terras Sagradas</p>
              </div>
            </div>
            <div className="space-y-2">
              {players.filter(p => p.team === 'NativePeoples').map(slot => (
                <PlayerSlotCard key={slot.id} slot={slot} onChange={updateSlot} />
              ))}
              {nativePlayers.length < 4 && (
                <p className="text-xs font-fell italic text-sepia/50 text-center py-2">
                  Mude o time de {4 - nativePlayers.length} jogador(es) para Povos Nativos
                </p>
              )}
            </div>
          </div>

          {/* Colonizers */}
          <div className="ornate-border rounded-sm p-4 bg-parchment/60">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/assets/generated/colonizers-emblem.dim_256x256.png"
                alt="Colonizadores"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h2 className="font-cinzel text-lg font-bold text-colonizer-red">Colonizadores</h2>
                <p className="font-fell italic text-xs text-sepia/60">Conquistadores do Novo Mundo</p>
              </div>
            </div>
            <div className="space-y-2">
              {players.filter(p => p.team === 'Colonizers').map(slot => (
                <PlayerSlotCard key={slot.id} slot={slot} onChange={updateSlot} />
              ))}
              {colonizerPlayers.length < 4 && (
                <p className="text-xs font-fell italic text-sepia/50 text-center py-2">
                  Mude o time de {4 - colonizerPlayers.length} jogador(es) para Colonizadores
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="mt-6 ornate-border rounded-sm p-4 bg-parchment/40">
          <h3 className="font-cinzel text-sm font-bold text-sepia mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" /> Regras do Jogo
          </h3>
          <ul className="font-fell text-xs text-sepia/70 space-y-1 list-disc list-inside">
            <li>Os <strong>Colonizadores</strong> devem conquistar todos os territórios em <strong>10 minutos</strong></li>
            <li>Os <strong>Povos Nativos</strong> vencem se sobreviverem ao tempo limite</li>
            <li>Ocupe um território sem oposição para capturá-lo gradualmente</li>
            <li>Clique em uma unidade para selecioná-la, depois clique no mapa para mover</li>
            <li>Unidades podem atacar inimigos próximos ou se fortalecer em território aliado</li>
          </ul>
        </div>

        {/* Start button */}
        <div className="mt-6 text-center">
          <Button
            onClick={() => onStartGame(players)}
            disabled={!canStart}
            className={`
              font-cinzel text-base px-10 py-3 h-auto tracking-wider
              ${canStart
                ? 'bg-sepia hover:bg-sepia/80 text-parchment shadow-parchment'
                : 'bg-sepia/30 text-sepia/40 cursor-not-allowed'
              }
            `}
          >
            ⚔ Iniciar Batalha ⚔
          </Button>
          {!canStart && (
            <p className="font-fell italic text-xs text-sepia/50 mt-2">
              Configure todos os 8 jogadores com times balanceados para começar
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-sepia/20">
        <p className="font-fell text-xs text-sepia/50">
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
