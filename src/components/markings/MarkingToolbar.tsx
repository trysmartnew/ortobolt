import { MarkingTool } from '../../types/markings';


interface MarkingToolbarProps {
  activeTool: MarkingTool | null;
  onToolChange: (tool: MarkingTool | null) => void;
  onClear: () => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

export function MarkingToolbar({ activeTool, onToolChange, onClear, onSave, hasUnsavedChanges }: MarkingToolbarProps) {
  const tools: { id: MarkingTool; label: string }[] = [
    { id: 'circle', label: '⊙ Círculo' },
    { id: 'angle-tpa', label: '∠ TPA' },
    { id: 'angle-norberg', label: '∠ Norberg' },
    { id: 'marker', label: '◉ Marcador' },
    { id: 'roi', label: '▭ ROI' },
    { id: 'select', label: '✋ Selecionar' }
  ];

  return (
    <div className='flex flex-row gap-2 p-2 bg-[#131923] rounded-t-lg items-center'>
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id === 'select' ? null : tool.id)}
          className={`px-3 py-1.5 text-sm transition-colors ${activeTool === tool.id
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            } rounded-md`}
        >
          {tool.label}
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
        disabled={!hasUnsavedChanges}
        className={`px-3 py-1.5 text-sm rounded-md ${hasUnsavedChanges
          ? 'border border-yellow-400 text-yellow-400'
          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
      >
        💾 Salvar
      </button>
    </div>
  );
}
