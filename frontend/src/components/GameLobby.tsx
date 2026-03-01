import React, { useState } from 'react';
import { PlayerSlot, Team, ClassType } from '../types/game';
import { PlayerSlotCard } from './PlayerSlotCard';
import { Button } from '@/components/ui/button';

interface GameLobbyProps {
  onStartGame: (players: PlayerSlot[]) => void;
}

function createDefaultSlot(id: string, team: Team, isBot: boolean, classType: ClassType): PlayerSlot {
  return {
    id,
    name: isBot ? `Bot ${id}` : `Jogador ${id}`,
    isBot,
    team,
    class: classType,
  };
}

const DEFAULT_SLOTS: PlayerSlot[] = [
  createDefaultSlot('1', 'NativePeoples', false, 'ForestWarrior'),
  createDefaultSlot('2', 'NativePeoples', true, 'SpiritHunter'),
  createDefaultSlot('3', 'NativePeoples', true, 'Shaman'),
  createDefaultSlot('4', 'NativePeoples', true, 'Sentinel'),
  createDefaultSlot('5', 'Colonizers', true, 'MusketSoldier'),
  createDefaultSlot('6', 'Colonizers', true, 'Captain'),
  createDefaultSlot('7', 'Colonizers', true, 'Engineer'),
  createDefaultSlot('8', 'Colonizers', true, 'Missionary'),
];

export function GameLobby({ onStartGame }: GameLobbyProps) {
  const [slots, setSlots] = useState<PlayerSlot[]>(DEFAULT_SLOTS);

  const nativeSlots = slots.filter(s => s.team === 'NativePeoples');
  const colonizerSlots = slots.filter(s => s.team === 'Colonizers');

  const isBalanced = nativeSlots.length === colonizerSlots.length;
  const hasEnoughPlayers = slots.length >= 2;

  const handleSlotChange = (updated: PlayerSlot) => {
    setSlots(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleStartGame = () => {
    if (!isBalanced || !hasEnoughPlayers) return;
    onStartGame(slots);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sepia to-parchment/20 flex flex-col">
      {/* Header */}
      <header className="text-center py-8 px-4">
        <div className="flex justify-center gap-6 mb-4">
          <img src="/assets/generated/native-peoples-emblem.dim_256x256.png" alt="Nativos" className="w-16 h-16 object-contain opacity-90" />
          <div>
            <h1 className="font-cinzel text-4xl font-bold text-ochre tracking-wider" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              Terras do Século XVI
            </h1>
            <p className="font-fell text-parchment/70 text-lg mt-1">RPG Estratégico Multiplayer 4v4</p>
          </div>
          <img src="/assets/generated/colonizers-emblem.dim_256x256.png" alt="Colonizadores" className="w-16 h-16 object-contain opacity-90" />
        </div>
        <div className="flex justify-center gap-4 text-sm text-parchment/60 font-fell">
          <span>🎭 RPG com Classes</span>
          <span>•</span>
          <span>🧠 Estratégia Territorial</span>
          <span>•</span>
          <span>⏳ Pressão por Tempo</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-8">
        {/* Teams Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Native Peoples */}
          <div className="bg-native-green/10 border-2 border-native-green/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <img src="/assets/generated/native-peoples-emblem.dim_256x256.png" alt="Nativos" className="w-10 h-10 object-contain" />
              <div>
                <h2 className="font-cinzel text-lg font-bold text-native-green">🛖 Povos Nativos</h2>
                <p className="text-xs text-parchment/60">Mobilidade, resistência e conhecimento do território</p>
              </div>
            </div>
            <div className="space-y-2">
              {slots.filter(s => s.team === 'NativePeoples').map((slot, i) => (
                <PlayerSlotCard key={slot.id} slot={slot} onChange={handleSlotChange} slotIndex={i} />
              ))}
            </div>
          </div>

          {/* Colonizers */}
          <div className="bg-colonizer-red/10 border-2 border-colonizer-red/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <img src="/assets/generated/colonizers-emblem.dim_256x256.png" alt="Colonizadores" className="w-10 h-10 object-contain" />
              <div>
                <h2 className="font-cinzel text-lg font-bold text-colonizer-red">🏴‍☠️ Colonizadores</h2>
                <p className="text-xs text-parchment/60">Organização, poder bélico e construção</p>
              </div>
            </div>
            <div className="space-y-2">
              {slots.filter(s => s.team === 'Colonizers').map((slot, i) => (
                <PlayerSlotCard key={slot.id} slot={slot} onChange={handleSlotChange} slotIndex={i + 4} />
              ))}
            </div>
          </div>
        </div>

        {/* Game Rules */}
        <div className="bg-parchment/5 border border-parchment/20 rounded-xl p-4 mb-6">
          <h3 className="font-cinzel text-sm font-bold text-ochre mb-3">📜 Regras da Partida</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-parchment/70 font-fell">
            <div>
              <p className="font-bold text-parchment/90 mb-1">🏆 Vitória dos Colonizadores</p>
              <p>Controlar Aldeia, Rio e Forte simultaneamente por 10 minutos contínuos.</p>
            </div>
            <div>
              <p className="font-bold text-parchment/90 mb-1">🛡️ Vitória dos Nativos</p>
              <p>Resistir até o tempo máximo da partida sem que os colonizadores completem o domínio.</p>
            </div>
            <div>
              <p className="font-bold text-parchment/90 mb-1">📈 Progressão RPG</p>
              <p>Ganhe XP, suba de nível e escolha caminhos de talentos durante a partida.</p>
            </div>
          </div>
        </div>

        {/* Balance Warning */}
        {!isBalanced && (
          <div className="bg-terracotta/20 border border-terracotta/40 rounded-lg p-3 mb-4 text-center text-sm text-terracotta font-fell">
            ⚠️ Os times precisam ter o mesmo número de jogadores para iniciar.
          </div>
        )}

        {/* Start Button */}
        <div className="text-center">
          <Button
            onClick={handleStartGame}
            disabled={!isBalanced || !hasEnoughPlayers}
            className="font-cinzel text-lg px-12 py-4 bg-ochre hover:bg-ochre/80 text-sepia font-bold rounded-lg border-2 border-ochre/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
          >
            ⚔️ Iniciar Partida
          </Button>
          <p className="text-xs text-parchment/40 mt-2 font-fell">
            {nativeSlots.length} Nativos vs {colonizerSlots.length} Colonizadores
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-parchment/30 font-fell border-t border-parchment/10">
        <p>© {new Date().getFullYear()} Terras do Século XVI — Built with ❤️ using{' '}
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
