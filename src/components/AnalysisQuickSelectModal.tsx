import React, { memo, useCallback } from 'react';
import {
    Stethoscope,
    GitCompare,
    TrendingUp,
    Activity,
    X,
    LucideIcon,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { Page } from '@/contexts/AppContext';

/**
 * Configuração estática das 4 análises veterinárias
 * Definida FORA do escopo do componente para evitar alocação desnecessária de memória
 */
const ANALYSIS_TYPES = [
    {
        id: 'diagnostic',
        label: 'Diagnóstica',
        description: 'Laudo e identificação inicial',
        page: 'analysis' as const,
        icon: Stethoscope,
        color: 'from-blue-500 to-blue-600',
        hoverColor: 'hover:border-blue-400',
        accentColor: '#00A36C', // Verde Jade para glow
    },
    {
        id: 'comparative',
        label: 'Comparativa',
        description: 'Comparação lado-a-lado',
        page: 'comparative' as const,
        icon: GitCompare,
        color: 'from-purple-500 to-purple-600',
        hoverColor: 'hover:border-purple-400',
        accentColor: '#00A36C',
    },
    {
        id: 'evolutionary',
        label: 'Evolutiva',
        description: 'Linha do tempo e progressão',
        page: 'evolutionaryAnalysis' as const,
        icon: TrendingUp,
        color: 'from-green-500 to-green-600',
        hoverColor: 'hover:border-green-400',
        accentColor: '#00A36C',
    },
    
] as const;

/**
 * Interface para Props do Card memoizado
 */
interface AnalysisCardProps {
    type: (typeof ANALYSIS_TYPES)[number];
    onClick: (item: typeof ANALYSIS_TYPES[number]) => void;
}

/**
 * Sub-componente AnalysisCard memoizado
 * Renderiza um único card de análise com micro-interações Tailwind v4
 * Envolvido em React.memo para evitar re-renders desnecessários
 */
const AnalysisCard = memo<AnalysisCardProps>(({ type, onClick }) => {
    const Icon = type.icon as LucideIcon;

    const handleClick = useCallback(() => {
        onClick(type);
    }, [type, onClick]);

    return (
        <button
            onClick={handleClick}
            className={`
        group relative overflow-hidden
        bg-gradient-to-br from-[#0A2E5C] to-[#001941]
        border-2 border-[#00A36C]/20
        rounded-lg p-6
        cursor-pointer
        transition-all duration-300 ease-out
        ${type.hoverColor}
        hover:shadow-lg hover:shadow-[#00A36C]/40
        hover:scale-102
        hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A36C]
        active:scale-95
      `}
            aria-label={`Iniciar análise ${type.label}`}
        >
            {/* Glow effect background (pseudo-element replacement) */}
            <div
                className="
          absolute inset-0 opacity-0 group-hover:opacity-100
          bg-gradient-to-br from-[#00A36C]/10 to-transparent
          transition-opacity duration-300
          pointer-events-none
        "
            />

            {/* Conteúdo do Card */}
            <div className="relative z-10 flex flex-col items-center text-center gap-3">
                {/* Ícone com animação no hover */}
                <div className="relative">
                    <Icon
                        size={40}
                        className="
              text-[#00A36C]
              transition-all duration-300
              group-hover:scale-125
              group-hover:drop-shadow-[0_0_8px_rgba(0,163,108,0.6)]
            "
                        strokeWidth={1.5}
                    />
                    {/* Subtil pulsing glow no ícone */}
                    <div
                        className="
              absolute inset-0 rounded-full
              border-2 border-[#00A36C]/0
              group-hover:border-[#00A36C]/30
              group-hover:animate-pulse
              transition-all duration-300
            "
                    />
                </div>

                {/* Label */}
                <h4
                    className="
            text-sm font-bold text-white
            transition-colors duration-300
            group-hover:text-[#00C77A]
          "
                >
                    {type.label}
                </h4>

                {/* Descrição */}
                <p className="text-xs text-stone-400 leading-tight">
                    {type.description}
                </p>

                {/* Bottom accent line (Verde Jade) */}
                <div
                    className="
            h-1 w-8 bg-[#00A36C]
            rounded-full
            transition-all duration-300
            group-hover:w-12
            group-hover:drop-shadow-[0_0_6px_rgba(0,163,108,0.5)]
          "
                />
            </div>
        </button>
    );
});

AnalysisCard.displayName = 'AnalysisCard';

/**
 * Interface para Props do Modal
 */
interface AnalysisQuickSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Componente Principal: AnalysisQuickSelectModal
 * Modal contextual leve com cascata de 4 cards de análise
 * Performance otimizada com memoização incremental
 */
export const AnalysisQuickSelectModal = memo<AnalysisQuickSelectModalProps>(
    ({ isOpen, onClose }) => {
        const { setCurrentPage, setAnalysisMode } = useApp();

        /**
         * Handler de seleção memoizado com useCallback
         * Mantém referência consistente se dependências não mudarem
         */
const handleSelect = useCallback(
            (item: typeof ANALYSIS_TYPES[number]) => {
                if (item.id === 'comparative') {
                    setAnalysisMode('compare');
                } else {
                    setAnalysisMode('analysis');
                }
                setCurrentPage(item.page);
                onClose();
            },
            [setCurrentPage, setAnalysisMode, onClose]
        );

        // Evita render do portal se modal está fechado
        if (!isOpen) return null;

        return (
            <>
                {/* Overlay com blur background */}
                <div
                    className="
            fixed inset-0 z-40
            bg-black/40 backdrop-blur-sm
            transition-opacity duration-300
            animate-fade-in
          "
                    onClick={onClose}
                    role="presentation"
                />

                {/* Modal Container */}
                <div
                    className="
            fixed inset-0 z-50
            flex items-center justify-center
            pointer-events-none
          "
                >
                    <div
                        className="
              pointer-events-auto
              bg-gradient-to-b from-[#001941] to-[#0A2E5C]
              border border-[#00A36C]/20
              rounded-2xl
              shadow-2xl shadow-[#00A36C]/10
              w-full max-w-2xl mx-4
              p-8
              animate-scale-in
            "
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    Selecionar Análise
                                </h2>
                                <p className="text-sm text-stone-400 mt-1">
                                    Escolha o tipo de análise para sua imagem
                                </p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="
                  p-2 rounded-lg
                  text-stone-400 hover:text-white
                  hover:bg-white/10
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-[#00A36C]
                "
                                aria-label="Fechar modal"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Grid de Cards com stagger animation */}
                        <div
                            className="
                grid grid-cols-2 gap-6
                md:gap-4
                sm:grid-cols-1
              "
                        >
                            {ANALYSIS_TYPES.map((type, index) => (
                                <div
                                    key={type.id}
                                    style={{
                                        animation: `slideUp 0.4s ease-out ${index * 0.1}s both`,
                                    }}
                                >
                                    <AnalysisCard
                                        type={type}
                                        onClick={handleSelect}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Footer Info */}
                        <div
                            className="
                mt-8 pt-6
                border-t border-[#00A36C]/10
                text-center text-xs text-stone-500
              "
                        >
                            💡 Dica: Use as rotas diretas para atalhos ainda mais rápidos
                        </div>
                    </div>
                </div>

                {/* Keyframe animations (inline styles) */}
                <style>{`
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes scale-in {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }

          .animate-scale-in {
            animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .scale-102 {
            transform: scale(1.02);
          }

          .-translate-y-1 {
            transform: translateY(-4px);
          }
        `}</style>
            </>
        );
    }
);

AnalysisQuickSelectModal.displayName = 'AnalysisQuickSelectModal';

export default AnalysisQuickSelectModal;

