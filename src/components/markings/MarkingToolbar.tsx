import { MarkingTool } from '../../types/markings';

interface MarkingToolbarProps {
  activeTool: MarkingTool | null;
  onToolChange: (tool: MarkingTool | null) => void;
  onClear: () => void;
  onSave: () => void;
  onExport?: () => void;
  hasUnsavedChanges: boolean;
  saving?: boolean;
  mode?: 'annotate' | 'review';
}

export function MarkingToolbar({ activeTool, onToolChange, onClear, onSave, onExport, hasUnsavedChanges, saving = false, mode = 'annotate' }: MarkingToolbarProps) {
  const tools: { id: MarkingTool; label: string; hotkey: string }[] = [
    { id: 'circle', label: '⊙ Círculo', hotkey: 'C' },
    { id: 'angle-tpa', label: '∠ TPA', hotkey: 'A' },
    { id: 'angle-norberg', label: '∠ Norberg', hotkey: 'N' },
    { id: 'marker', label: '◉ Marcador', hotkey: 'M' },
    { id: 'roi', label: '▭ ROI', hotkey: 'R' },
    { id: 'select', label: '✋ Selecionar', hotkey: 'ESC' }
  ];

  if (mode === 'review') {
    return (
      <div className='flex flex-row gap-2 p-2 bg-[#131923] rounded-t-lg items-center'>
        <div className='text-xs text-slate-400 font-mono'>📖 MODO VISUALIZAÇÃO</div>
        {onExport && (
          <button
            onClick={onExport}
             className='px-3 py-1.5 text-sm bg-primary text-white hover:bg-primary-dark rounded-md'
          >
            📥 Exportar Marcações
          </button>
        )}
      </div>
    );
  }

  return (
    <div className='flex flex-row gap-2 p-2 bg-[#131923] rounded-t-lg items-center flex-wrap'>
      <div className='text-xs text-slate-400 font-mono'>✏️ MODO ANOTAÇÃO</div>
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id === 'select' ? null : tool.id)}
          title={`Hotkey: ${tool.hotkey}`}
          className={`px-3 py-1.5 text-sm transition-colors relative ${activeTool === tool.id
            ? 'bg-primary text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            } rounded-md`}
        >
          {tool.label}
          <span className='text-[10px] absolute -top-1 -right-1 bg-gray-900 px-1 rounded'>{tool.hotkey}</span>
        </button>
      ))}
      <div className='h-6 w-px bg-gray-700 mx-2' />

      <button
        onClick={() => {
          if (window.confirm('Remover todas as marcações? Esta ação não pode ser desfeita.')) onClear();
        }}
        className='px-3 py-1.5 text-sm bg-gray-800 text-red-400 hover:bg-red-900/20 rounded-md'
      >
        🗑 Limpar
      </button>

      <button
        onClick={onSave}
        disabled={!hasUnsavedChanges || saving}
        className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${hasUnsavedChanges && !saving
          ? 'border border-yellow-400 text-yellow-400 hover:bg-yellow-900/20'
          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
      >
        {saving ? (
          <>
            <span className="animate-spin inline-block h-4 w-4 border border-current border-t-transparent rounded-full" />
            Salvando...
          </>
        ) : (
          <>💾 Salvar</>
        )}
      </button>

      {onExport && (
        <button
          onClick={onExport}
          className='px-3 py-1.5 text-sm bg-emerald-800 text-emerald-300 hover:bg-emerald-900/40 rounded-md'
        >
          📥 Exportar
        </button>
      )}
    </div>
  );
}
