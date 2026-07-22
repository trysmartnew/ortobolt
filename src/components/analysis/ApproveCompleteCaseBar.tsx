import { useState, useEffect } from 'react';
import { CheckCircle2, FolderOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui';

export interface ApproveCompleteCaseBarProps {
  disabled: boolean;
  defaultTitle: string;
  onApprove: (title: string, destination: 'case' | 'gallery') => void;
}

export default function ApproveCompleteCaseBar({
  disabled,
  defaultTitle,
  onApprove,
}: ApproveCompleteCaseBarProps) {
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    setTitle(defaultTitle);
  }, [defaultTitle]);

  return (
    <div
      data-tour="tour-approve-case"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-white">Aprovar Caso Completo</p>
          <p className="text-xs text-white/70 mt-0.5">
            Propaga automaticamente para Galeria, Caso, Painel Clínico e Relatórios — sem retrabalho.
          </p>
        </div>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do caso"
        className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-[#111315] text-white"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          className="flex-1"
          disabled={disabled || !title.trim()}
          onClick={() => onApprove(title.trim(), 'case')}
        >
          <FileText size={14} /> Aprovar e abrir Caso
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={disabled || !title.trim()}
          onClick={() => onApprove(title.trim(), 'gallery')}
        >
          <FolderOpen size={14} /> Aprovar e ir à Galeria
        </Button>
      </div>
    </div>
  );
}

