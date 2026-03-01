import React, { useState } from 'react';
import type { PlayerSlot } from './types/game';
import { GameLobby } from './components/GameLobby';
import { GamePage } from './pages/GamePage';

type AppView = 'lobby' | 'game';

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [players, setPlayers] = useState<PlayerSlot[]>([]);

  const handleStartGame = (selectedPlayers: PlayerSlot[]) => {
    setPlayers(selectedPlayers);
    setView('game');
  };

  const handleReturnToLobby = () => {
    setView('lobby');
    setPlayers([]);
  };

  if (view === 'game' && players.length === 8) {
    return (
      <GamePage
        players={players}
        onReturnToLobby={handleReturnToLobby}
      />
    );
  }

  return <GameLobby onStartGame={handleStartGame} />;
}
