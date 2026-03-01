import React, { useState } from 'react';
import { GameLobby } from './components/GameLobby';
import { GamePage } from './pages/GamePage';
import { LandingScreen } from './components/LandingScreen';
import { TutorialScreen } from './components/TutorialScreen';
import type { PlayerSlot } from './types/game';

type AppView = 'landing' | 'tutorial' | 'lobby' | 'game';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [players, setPlayers] = useState<PlayerSlot[] | null>(null);

  const handleStartGame = (selectedPlayers: PlayerSlot[]) => {
    setPlayers(selectedPlayers);
    setView('game');
  };

  const handleReturnToLobby = () => {
    setPlayers(null);
    setView('lobby');
  };

  if (view === 'landing') {
    return (
      <LandingScreen
        onPlayClick={() => setView('lobby')}
        onTutorialClick={() => setView('tutorial')}
      />
    );
  }

  if (view === 'tutorial') {
    return (
      <TutorialScreen
        onComplete={() => setView('landing')}
        onSkip={() => setView('landing')}
      />
    );
  }

  if (view === 'game' && players && players.length > 0) {
    return (
      <GamePage
        players={players}
        onReturnToLobby={handleReturnToLobby}
      />
    );
  }

  return <GameLobby onStartGame={handleStartGame} />;
}
