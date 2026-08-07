// src/components/WorkflowStepper.tsx
// Progress bar horizontal com marcadores de etapas.
// Etapa ativa em jade (#29a399), concluidas com check, futuras neutras.
// Linha de progresso proporcional ao estado atual.
// Posicionado no topo da area de conteudo (abaixo do TopBar).

import { Check } from 'lucide-react';
import React from 'react';

import { WORKFLOW_STEPS } from '@/config/workflowSteps';
import { useWorkflowStep } from '@/hooks/useWorkflowStep';

export default function WorkflowStepper(): React.ReactElement | null {
  const { page, currentStep } = useWorkflowStep();
  const steps = page ? WORKFLOW_STEPS[page] : null;

  if (!steps || currentStep < 0) return null;

  const total = steps.length;
  const progressPercent = ((currentStep + 0.5) / total) * 100;

  return (
    <div
      className="w-full px-6 pt-4 pb-3 border-b border-[#22262a] bg-[#0e1011] shrink-0"
      role="progressbar"
      aria-label="Progresso do fluxo de analise"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <div className="relative max-w-5xl mx-auto">
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-white/10 rounded-full" />
        <div
          className="absolute top-3 left-0 h-0.5 bg-[#29a399] rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPercent}%`,
            boxShadow: '0 0 8px rgba(41, 163, 153, 0.4)',
          }}
        />
        <div className="relative flex justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;

            const dotClass = isActive
              ? 'bg-[#29a399] border-[#29a399] text-white shadow-premium-glow'
              : isCompleted
                ? 'bg-[#29a399] border-[#29a399] text-white'
                : 'bg-[#1a1d1f] border-white/20 text-white/40';

            const labelClass = isActive
              ? 'text-[#29a399] font-semibold'
              : isCompleted
                ? 'text-white/70'
                : 'text-white/40';

            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`
                    relative z-10 flex items-center justify-center
                    w-6 h-6 rounded-full border-2
                    transition-all duration-300
                    ${dotClass}
                  `}
                >
                  {isCompleted ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span className="text-[10px] font-mono font-bold leading-none">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-medium transition-colors ${labelClass}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
