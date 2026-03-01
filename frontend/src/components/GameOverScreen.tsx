import React, { useEffect, useRef } from 'react';
import type { Team } from '../types/game';
import { Button } from '@/components/ui/button';
import { RotateCcw, Home } from 'lucide-react';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface GameOverScreenProps {
  winner: Team;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number; maxLife: number;
}

export function GameOverScreen({ winner, onPlayAgain, onReturnToLobby }: GameOverScreenProps) {
  const isNativeWin = winner === 'NativePeoples';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const { playGameOverFanfare } = useSoundEffects();
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      setTimeout(() => playGameOverFanfare(), 300);
    }
  }, [playGameOverFanfare]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = isNativeWin
      ? ['#2d6e3a', '#4a9a5a', '#d4af37', '#8bc34a', '#f4e8d0']
      : ['#8b2020', '#d4af37', '#c8a96e', '#b84040', '#f4e8d0'];

    function spawnParticles() {
      const w = canvas!.width;
      for (let i = 0; i < 80; i++) {
        particlesRef.current.push({
          x: Math.random() * w, y: -10,
          vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4, life: 1,
          maxLife: Math.random() * 120 + 80,
        });
      }
    }

    spawnParticles();
    let frame = 0;

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame % 30 === 0 && frame < 300) spawnParticles();
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.99;
        p.life -= 1 / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (Math.floor(p.maxLife) % 2 === 0) {
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.translate(p.x, p.y);
          ctx.rotate(frame * 0.05);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      frame++;
      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isNativeWin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sepia/70 backdrop-blur-sm">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div
        className="relative bg-parchment border-4 border-sepia rounded-lg p-8 max-w-md w-full mx-4 text-center"
        style={{
          boxShadow: '0 0 0 4px oklch(0.65 0.07 65), 0 20px 60px rgba(0,0,0,0.5)',
          animation: 'gameOverEntrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-px flex-1 bg-sepia/40" />
          <span className="text-ochre text-lg">✦</span>
          <div className="h-px flex-1 bg-sepia/40" />
        </div>

        <div className="flex justify-center mb-4">
          <div style={{ animation: 'emblemPulse 1.5s ease-in-out infinite' }}>
            <img
              src={isNativeWin
                ? '/assets/generated/native-peoples-emblem.dim_256x256.png'
                : '/assets/generated/colonizers-emblem.dim_256x256.png'}
              alt={isNativeWin ? 'Povos Nativos' : 'Colonizadores'}
              className="w-28 h-28 object-contain drop-shadow-lg"
            />
          </div>
        </div>

        <h2
          className="font-cinzel text-2xl font-bold mb-1"
          style={{
            color: isNativeWin ? 'oklch(0.42 0.14 145)' : 'oklch(0.38 0.16 25)',
            animation: 'titleGlow 2s ease-in-out infinite',
          }}
        >
          {isNativeWin ? '🌿 Vitória dos Povos Nativos!' : '⚔ Vitória dos Colonizadores!'}
        </h2>

        <p className="font-fell italic text-sepia/70 text-sm mb-4">
          {isNativeWin
            ? 'As terras sagradas foram protegidas. Os ancestrais sorriem.'
            : 'O Novo Mundo foi conquistado. A bandeira dos colonizadores tremula.'}
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-px flex-1 bg-sepia/30" />
          <span className="text-ochre/60 text-sm">⚜</span>
          <div className="h-px flex-1 bg-sepia/30" />
        </div>

        <div className="bg-parchment/60 rounded-sm p-3 mb-6 border border-sepia/20">
          <p className="font-fell text-xs text-sepia/70 italic">
            {isNativeWin
              ? '"Nossas terras, nosso sangue, nossa memória — nada pode apagar o que somos."'
              : '"Em nome da Coroa, estas terras agora pertencem ao Velho Mundo."'}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button onClick={onPlayAgain} className="font-cinzel text-sm bg-sepia hover:bg-sepia/80 text-parchment px-5">
            <RotateCcw className="w-4 h-4 mr-2" />
            Jogar Novamente
          </Button>
          <Button onClick={onReturnToLobby} variant="outline" className="font-cinzel text-sm border-sepia/60 text-sepia hover:bg-sepia/10 px-5">
            <Home className="w-4 h-4 mr-2" />
            Lobby
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-px flex-1 bg-sepia/40" />
          <span className="text-ochre text-lg">✦</span>
          <div className="h-px flex-1 bg-sepia/40" />
        </div>
      </div>

      <style>{`
        @keyframes gameOverEntrance {
          from { opacity: 0; transform: scale(0.7) translateY(-30px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes emblemPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 8px rgba(212,175,55,0.3); }
          50%       { text-shadow: 0 0 20px rgba(212,175,55,0.6); }
        }
      `}</style>
    </div>
  );
}
