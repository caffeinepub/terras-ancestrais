import React from 'react';

interface LandingScreenProps {
  onPlayClick: () => void;
  onTutorialClick: () => void;
}

export function LandingScreen({ onPlayClick, onTutorialClick }: LandingScreenProps) {
  return (
    <div className="min-h-screen parchment-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative corner ornaments */}
      <div className="absolute top-4 left-4 w-16 h-16 opacity-30 pointer-events-none">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4 L4 28 M4 4 L28 4 M4 4 L20 20" stroke="oklch(0.35 0.08 55)" strokeWidth="2"/>
          <circle cx="4" cy="4" r="3" fill="oklch(0.72 0.12 75)"/>
          <circle cx="20" cy="20" r="2" fill="oklch(0.72 0.12 75)"/>
        </svg>
      </div>
      <div className="absolute top-4 right-4 w-16 h-16 opacity-30 pointer-events-none" style={{ transform: 'scaleX(-1)' }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4 L4 28 M4 4 L28 4 M4 4 L20 20" stroke="oklch(0.35 0.08 55)" strokeWidth="2"/>
          <circle cx="4" cy="4" r="3" fill="oklch(0.72 0.12 75)"/>
          <circle cx="20" cy="20" r="2" fill="oklch(0.72 0.12 75)"/>
        </svg>
      </div>
      <div className="absolute bottom-4 left-4 w-16 h-16 opacity-30 pointer-events-none" style={{ transform: 'scaleY(-1)' }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4 L4 28 M4 4 L28 4 M4 4 L20 20" stroke="oklch(0.35 0.08 55)" strokeWidth="2"/>
          <circle cx="4" cy="4" r="3" fill="oklch(0.72 0.12 75)"/>
          <circle cx="20" cy="20" r="2" fill="oklch(0.72 0.12 75)"/>
        </svg>
      </div>
      <div className="absolute bottom-4 right-4 w-16 h-16 opacity-30 pointer-events-none" style={{ transform: 'scale(-1,-1)' }}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4 L4 28 M4 4 L28 4 M4 4 L20 20" stroke="oklch(0.35 0.08 55)" strokeWidth="2"/>
          <circle cx="4" cy="4" r="3" fill="oklch(0.72 0.12 75)"/>
          <circle cx="20" cy="20" r="2" fill="oklch(0.72 0.12 75)"/>
        </svg>
      </div>

      {/* Map background subtle overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/generated/map-background-v2.dim_1200x800.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main content card */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 py-10 max-w-2xl w-full mx-4">
        {/* Emblems row */}
        <div className="flex items-center gap-8">
          <img
            src="/assets/generated/native-peoples-emblem.dim_256x256.png"
            alt="Povos Nativos"
            className="w-20 h-20 object-contain drop-shadow-lg"
            style={{ animation: 'emblemPulse 3s ease-in-out infinite' }}
          />
          <div className="flex flex-col items-center">
            <div
              className="ornate-border parchment-bg px-8 py-6 text-center"
              style={{ borderRadius: '4px' }}
            >
              <p
                className="period-title text-xs tracking-widest mb-1"
                style={{ color: 'oklch(0.55 0.10 60)', letterSpacing: '0.25em' }}
              >
                ✦ ANNO DOMINI MDXVI ✦
              </p>
              <h1
                className="period-title text-4xl md:text-5xl font-bold leading-tight"
                style={{
                  color: 'oklch(0.28 0.08 55)',
                  textShadow: '1px 2px 4px oklch(0.35 0.08 55 / 0.3)',
                  animation: 'titleGlow 4s ease-in-out infinite',
                }}
              >
                Terras do
              </h1>
              <h1
                className="period-title text-4xl md:text-5xl font-bold leading-tight"
                style={{
                  color: 'oklch(0.28 0.08 55)',
                  textShadow: '1px 2px 4px oklch(0.35 0.08 55 / 0.3)',
                  animation: 'titleGlow 4s ease-in-out infinite',
                }}
              >
                Século XVI
              </h1>
              <div
                className="mt-2 h-px w-full"
                style={{ background: 'linear-gradient(90deg, transparent, oklch(0.55 0.10 60), transparent)' }}
              />
              <p
                className="period-text italic mt-2 text-sm"
                style={{ color: 'oklch(0.45 0.06 60)' }}
              >
                Conquista, Resistência e Destino
              </p>
            </div>
          </div>
          <img
            src="/assets/generated/colonizers-emblem.dim_256x256.png"
            alt="Colonizadores"
            className="w-20 h-20 object-contain drop-shadow-lg"
            style={{ animation: 'emblemPulse 3s ease-in-out infinite 1.5s' }}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px" style={{ background: 'oklch(0.55 0.10 60 / 0.5)' }} />
          <span className="period-text text-lg" style={{ color: 'oklch(0.55 0.10 60)' }}>⚔</span>
          <div className="flex-1 h-px" style={{ background: 'oklch(0.55 0.10 60 / 0.5)' }} />
        </div>

        {/* Description */}
        <p
          className="period-text text-center text-base leading-relaxed max-w-md"
          style={{ color: 'oklch(0.38 0.07 58)' }}
        >
          Dois povos. Um continente. Cada decisão moldará o destino das terras ancestrais.
          Escolha seu lado e escreva a história.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={onPlayClick}
            className="flex-1 py-4 px-8 period-title font-bold text-lg transition-all duration-200 ornate-border"
            style={{
              background: 'linear-gradient(135deg, oklch(0.35 0.08 55), oklch(0.28 0.07 50))',
              color: 'oklch(0.92 0.04 85)',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              boxShadow: '0 4px 16px oklch(0.28 0.07 50 / 0.4), inset 0 1px 0 oklch(0.72 0.12 75 / 0.3)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, oklch(0.42 0.10 55), oklch(0.35 0.08 50))';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 6px 20px oklch(0.28 0.07 50 / 0.5), inset 0 1px 0 oklch(0.72 0.12 75 / 0.3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, oklch(0.35 0.08 55), oklch(0.28 0.07 50))';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 16px oklch(0.28 0.07 50 / 0.4), inset 0 1px 0 oklch(0.72 0.12 75 / 0.3)';
            }}
          >
            ⚔ Jogar
          </button>

          <button
            onClick={onTutorialClick}
            className="flex-1 py-4 px-8 period-title font-bold text-lg transition-all duration-200 ornate-border"
            style={{
              background: 'linear-gradient(135deg, oklch(0.72 0.12 75 / 0.3), oklch(0.65 0.10 70 / 0.2))',
              color: 'oklch(0.28 0.08 55)',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              boxShadow: '0 4px 16px oklch(0.55 0.10 60 / 0.2), inset 0 1px 0 oklch(0.92 0.04 85 / 0.5)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, oklch(0.72 0.12 75 / 0.5), oklch(0.65 0.10 70 / 0.4))';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'linear-gradient(135deg, oklch(0.72 0.12 75 / 0.3), oklch(0.65 0.10 70 / 0.2))';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            📜 Tutorial
          </button>
        </div>

        {/* Footer hint */}
        <p
          className="period-text italic text-xs text-center"
          style={{ color: 'oklch(0.55 0.06 65)' }}
        >
          Até 8 jogadores · Estratégia em turnos · Conquista de territórios
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-3 w-full text-center">
        <p className="period-text text-xs" style={{ color: 'oklch(0.55 0.06 65)' }}>
          © {new Date().getFullYear()} · Built with{' '}
          <span style={{ color: 'oklch(0.55 0.16 35)' }}>♥</span> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || 'unknown-app')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'oklch(0.42 0.10 55)', textDecoration: 'underline' }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
