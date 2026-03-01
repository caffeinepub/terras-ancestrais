import React, { useState } from 'react';

interface TutorialScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  title: string;
  icon: string;
  content: string;
  details: string[];
  image?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'O Mapa e os Territórios',
    icon: '🗺️',
    content:
      'O campo de batalha é composto por territórios de diferentes tipos, cada um com características únicas que influenciam o combate e a conquista.',
    details: [
      '🌲 Floresta — Bônus de defesa para Povos Nativos. Dificulta o avanço colonizador.',
      '🌾 Campo Aberto — Terreno neutro. Ideal para movimentação rápida e confrontos diretos.',
      '🏘️ Aldeia — Ponto estratégico. Quem controla aldeias ganha vantagem territorial.',
      '🏰 Forte — Alta defesa para quem o ocupa. Difícil de conquistar sem superioridade numérica.',
      '🌊 Rio — Limita o movimento. Unidades precisam de mais ações para atravessar.',
    ],
    image: '/assets/generated/map-background-v2.dim_1200x800.png',
  },
  {
    title: 'Seleção e Movimento de Unidades',
    icon: '🚶',
    content:
      'Cada turno, você pode mover suas unidades pelo mapa. Clique numa unidade para selecioná-la e veja o alcance de movimento destacado no mapa.',
    details: [
      '🖱️ Clique numa unidade aliada para selecioná-la.',
      '🟢 Hexágonos verdes indicam onde a unidade pode se mover.',
      '📍 Clique num hexágono válido para mover a unidade até lá.',
      '⚡ Cada unidade só pode se mover uma vez por turno.',
      '🔄 Após mover, a unidade ainda pode realizar uma ação (atacar, fortalecer, etc.).',
      '❌ Clique fora de qualquer unidade para desselecionar.',
    ],
  },
  {
    title: 'Ações em Combate',
    icon: '⚔️',
    content:
      'Após mover (ou sem mover), cada unidade pode realizar uma ação por turno. As ações disponíveis dependem da classe da unidade.',
    details: [
      '⚔️ Atacar — Causa dano a uma unidade inimiga adjacente. Reduz o HP do alvo.',
      '🛡️ Fortalecer — A unidade ganha bônus de defesa até o próximo turno.',
      '🌿 Habilidades de Classe — Cada classe possui uma habilidade especial única:',
      '   • Guerreiro da Floresta: Emboscada (dano extra em florestas)',
      '   • Xamã: Cura aliados próximos',
      '   • Sentinela: Ataque à distância',
      '   • Soldado de Mosquete: Disparo de longa distância',
      '   • Capitão: Bônus de moral para aliados',
    ],
  },
  {
    title: 'Conquista de Territórios',
    icon: '🏴',
    content:
      'Os Colonizadores vencem conquistando todos os territórios. Para conquistar, uma unidade colonizadora deve permanecer num território por turnos consecutivos sem ser expulsa.',
    details: [
      '🔴 Barra de conquista — Aparece sobre territórios sendo capturados.',
      '⏳ Cada turno com uma unidade colonizadora no território avança a barra.',
      '🛑 Unidades nativas podem interromper a conquista entrando no território.',
      '✅ Quando a barra chega a 100%, o território é conquistado pelos Colonizadores.',
      '🔁 Territórios conquistados podem ser reconquistados pelos Nativos.',
      '⚠️ Pontos estratégicos (aldeias e fortes) são mais difíceis de conquistar.',
    ],
  },
  {
    title: 'Condições de Vitória',
    icon: '🏆',
    content:
      'Cada equipe tem uma condição de vitória diferente. Conheça os objetivos para traçar sua estratégia!',
    details: [
      '🔴 Colonizadores vencem se conquistarem TODOS os territórios do mapa.',
      '🟢 Povos Nativos vencem se o tempo esgotar com pelo menos um território não conquistado.',
      '⏱️ O jogo tem duração de 5 minutos. O relógio é seu aliado ou inimigo!',
      '🎯 Estratégia Nativa: Defenda territórios-chave e atrase os colonizadores.',
      '🎯 Estratégia Colonizadora: Avance rapidamente e conquiste antes do tempo acabar.',
      '⚖️ O equilíbrio entre ataque e defesa é a chave para a vitória.',
    ],
  },
  {
    title: 'Progressão RPG: XP e Níveis',
    icon: '⭐',
    content:
      'Unidades ganham experiência (XP) ao combater e conquistar territórios. Ao subir de nível, você escolhe um caminho de talentos que define o estilo de jogo da unidade.',
    details: [
      '✨ XP é ganho ao atacar, defender e participar de conquistas.',
      '📈 Ao atingir o nível 2, uma janela de talentos aparece automaticamente.',
      '🌿 Caminho Nativo: Foco em mobilidade, furtividade e habilidades da floresta.',
      '⚔️ Caminho Guerreiro: Foco em ataque, resistência e combate direto.',
      '🔮 Cada caminho desbloqueia habilidades únicas e bônus de atributos.',
      '💡 Dica: Escolha o caminho que complementa a função da unidade no seu time!',
    ],
  },
];

export function TutorialScreen({ onComplete, onSkip }: TutorialScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen parchment-bg flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Background map overlay */}
      <div
        className="absolute inset-0 opacity-8 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/generated/map-background-v2.dim_1200x800.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.06,
        }}
      />

      {/* Skip button — always visible */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onSkip}
          className="period-text text-sm px-4 py-2 transition-all duration-150"
          style={{
            color: 'oklch(0.45 0.06 60)',
            border: '1px solid oklch(0.65 0.07 65)',
            borderRadius: '4px',
            background: 'oklch(0.92 0.04 85 / 0.8)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.85 0.05 78)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.92 0.04 85 / 0.8)';
          }}
        >
          Pular Tutorial ✕
        </button>
      </div>

      {/* Main tutorial card */}
      <div
        className="relative z-10 w-full max-w-2xl ornate-border parchment-bg"
        style={{ borderRadius: '4px', animation: 'gameOverEntrance 0.4s ease-out' }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 border-b"
          style={{ borderColor: 'oklch(0.65 0.07 65 / 0.5)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p
              className="period-title text-xs tracking-widest"
              style={{ color: 'oklch(0.55 0.10 60)', letterSpacing: '0.2em' }}
            >
              ✦ TUTORIAL ✦
            </p>
            <p
              className="period-text text-xs"
              style={{ color: 'oklch(0.55 0.06 65)' }}
            >
              {currentStep + 1} / {TUTORIAL_STEPS.length}
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'oklch(0.80 0.05 78)' }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, oklch(0.35 0.08 55), oklch(0.55 0.10 60))',
                borderRadius: '9999px',
              }}
            />
          </div>

          {/* Step title */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-3xl">{step.icon}</span>
            <h2
              className="period-title text-xl font-bold"
              style={{ color: 'oklch(0.28 0.08 55)' }}
            >
              {step.title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Map image for first step */}
          {step.image && (
            <div
              className="mb-4 rounded overflow-hidden ornate-border"
              style={{ maxHeight: '160px' }}
            >
              <img
                src={step.image}
                alt="Mapa"
                className="w-full object-cover"
                style={{ maxHeight: '160px', objectPosition: 'center' }}
              />
            </div>
          )}

          {/* Main description */}
          <p
            className="period-text text-base leading-relaxed mb-4"
            style={{ color: 'oklch(0.32 0.07 55)' }}
          >
            {step.content}
          </p>

          {/* Details list */}
          <div
            className="rounded p-4 space-y-2"
            style={{
              background: 'oklch(0.88 0.05 80 / 0.6)',
              border: '1px solid oklch(0.72 0.12 75 / 0.4)',
              borderRadius: '4px',
            }}
          >
            {step.details.map((detail, idx) => (
              <p
                key={idx}
                className="period-text text-sm leading-relaxed"
                style={{ color: 'oklch(0.35 0.07 58)' }}
              >
                {detail}
              </p>
            ))}
          </div>
        </div>

        {/* Footer navigation */}
        <div
          className="px-6 pb-6 pt-2 flex items-center justify-between border-t"
          style={{ borderColor: 'oklch(0.65 0.07 65 / 0.5)' }}
        >
          {/* Step dots */}
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className="transition-all duration-200"
                style={{
                  width: idx === currentStep ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  background:
                    idx === currentStep
                      ? 'oklch(0.35 0.08 55)'
                      : idx < currentStep
                      ? 'oklch(0.55 0.10 60)'
                      : 'oklch(0.75 0.05 70)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="period-title text-sm px-4 py-2 transition-all duration-150"
                style={{
                  color: 'oklch(0.45 0.06 60)',
                  border: '1px solid oklch(0.65 0.07 65)',
                  borderRadius: '4px',
                  background: 'transparent',
                  letterSpacing: '0.05em',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.85 0.05 78)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                ← Anterior
              </button>
            )}

            <button
              onClick={handleNext}
              className="period-title text-sm px-6 py-2 font-bold transition-all duration-150"
              style={{
                background: isLastStep
                  ? 'linear-gradient(135deg, oklch(0.40 0.12 145), oklch(0.32 0.10 145))'
                  : 'linear-gradient(135deg, oklch(0.35 0.08 55), oklch(0.28 0.07 50))',
                color: 'oklch(0.92 0.04 85)',
                borderRadius: '4px',
                letterSpacing: '0.08em',
                border: 'none',
                boxShadow: '0 2px 8px oklch(0.28 0.07 50 / 0.3)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 12px oklch(0.28 0.07 50 / 0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 2px 8px oklch(0.28 0.07 50 / 0.3)';
              }}
            >
              {isLastStep ? '✓ Concluir Tutorial' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>

      {/* Class emblems row */}
      <div className="relative z-10 flex items-center gap-3 mt-6 opacity-60">
        {[
          '/assets/generated/emblem-forest-warrior.dim_128x128.png',
          '/assets/generated/emblem-shaman.dim_128x128.png',
          '/assets/generated/emblem-sentinel.dim_128x128.png',
          '/assets/generated/emblem-musket-soldier.dim_128x128.png',
          '/assets/generated/emblem-captain.dim_128x128.png',
        ].map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt=""
            className="w-10 h-10 object-contain"
            style={{ filter: 'sepia(0.4)' }}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-4 text-center">
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
