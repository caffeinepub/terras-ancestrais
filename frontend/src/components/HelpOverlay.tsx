import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface HelpOverlayProps {
  onClose: () => void;
}

const controls = [
  {
    category: 'Seleção',
    items: [
      { key: 'Clique na unidade', desc: 'Seleciona sua unidade (anel brilhante = selecionável)' },
      { key: 'Clique novamente / Escape', desc: 'Desseleciona a unidade atual' },
      { key: 'Clique em área vazia', desc: 'Desseleciona a unidade atual' },
    ],
  },
  {
    category: 'Movimento',
    items: [
      { key: 'Selecione → Clique no mapa', desc: 'Move a unidade para aquela posição' },
      { key: 'Círculo amarelo', desc: 'Mostra o alcance de movimento disponível' },
      { key: 'Botão Mover', desc: 'Ativa o modo de movimento; clique no destino' },
    ],
  },
  {
    category: 'Combate',
    items: [
      { key: 'Selecione → Clique no inimigo', desc: 'Ataca aquela unidade inimiga diretamente' },
      { key: 'Botão Atacar', desc: 'Ataca o inimigo mais próximo no alcance (100px)' },
      { key: 'Botão Fortalecer', desc: 'Defende posição — reduz dano em 50% por 2 turnos' },
    ],
  },
  {
    category: 'Territórios',
    items: [
      { key: 'Fique no território', desc: 'Começa a capturá-lo automaticamente' },
      { key: 'Barra de progresso', desc: 'Mostra o progresso de captura abaixo do território' },
      { key: 'Borda colorida', desc: 'Indica qual equipe controla o território' },
    ],
  },
  {
    category: 'Condições de Vitória',
    items: [
      { key: 'Colonizadores', desc: 'Capturar todos os territórios para vencer' },
      { key: 'Povos Nativos', desc: 'Impedir a colonização total até o tempo acabar' },
      { key: 'Cronômetro', desc: '5 minutos — exibido no topo da tela' },
    ],
  },
  {
    category: 'Bônus de Terreno',
    items: [
      { key: '🌲 Floresta', desc: '−20% dano recebido' },
      { key: '🌾 Planície', desc: '+20 pontos de movimento' },
      { key: '⛰ Colinas', desc: 'Terreno elevado — vantagem defensiva' },
    ],
  },
];

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sepia/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative parchment-bg ornate-border rounded-sm max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 parchment-bg border-b border-sepia/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-cinzel text-xl font-bold text-sepia">Como Jogar</h2>
            <p className="font-fell text-xs text-sepia/60 mt-0.5">Guia de Controles e Estratégia</p>
          </div>
          <button
            onClick={onClose}
            className="text-sepia/50 hover:text-sepia transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {controls.map(section => (
            <div key={section.category}>
              <h3 className="font-cinzel text-sm font-bold text-ochre uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-ochre rounded-full inline-block" />
                {section.category}
              </h3>
              <div className="space-y-1.5">
                {section.items.map(item => (
                  <div key={item.key} className="flex items-start gap-3 text-sm">
                    <span className="bg-parchment/80 border border-sepia/30 text-sepia rounded-sm px-2 py-0.5 text-xs font-cinzel whitespace-nowrap min-w-fit">
                      {item.key}
                    </span>
                    <span className="font-fell text-sepia/70 pt-0.5">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Quick tip */}
          <div className="bg-ochre/15 border border-ochre/30 rounded-sm p-3 mt-4">
            <p className="font-cinzel text-xs font-bold text-ochre mb-1">💡 Dica Rápida</p>
            <p className="font-fell text-xs text-sepia/70">
              Suas unidades têm um anel brilhante pulsante. Selecione-as e clique dentro do círculo amarelo para mover. Clique diretamente em uma unidade inimiga para atacar!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-sepia/20 px-6 py-3 text-center">
          <p className="font-fell text-xs text-sepia/40">Pressione Escape ou clique fora para fechar</p>
        </div>
      </div>
    </div>
  );
}
