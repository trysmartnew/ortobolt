// src/components/ToastContainer.tsx
// ✅ U-02: Sistema de Toast global — feedback consistente para toda a aplicação

import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Toast } from '@/contexts/AppContext';

interface Props {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  error:   <XCircle    className="w-4 h-4 text-red-500 flex-shrink-0" />,
  info:    <Info       className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
};

const STYLES = {
  success: 'bg-white border-emerald-200 shadow-emerald-100',
  error:   'bg-white border-red-200 shadow-red-100',
  info:    'bg-white border-blue-200 shadow-blue-100',
  warning: 'bg-white border-amber-200 shadow-amber-100',
};

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notificações"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
            text-sm font-medium text-slate-700 max-w-sm w-full
            pointer-events-auto
            animate-[slideInRight_0.25s_ease-out]
            ${STYLES[toast.type]}
          `}
          role="alert"
        >
          {ICONS[toast.type]}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-slate-400 hover:text-slate-600 transition-colors ml-1 flex-shrink-0"
            aria-label="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
