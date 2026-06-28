import React, { useState } from 'react';
import { useRadiographs, RadiographItem } from '../../hooks/useRadiographs';
import { RadiographUploader } from './RadiographUploader';

interface RadiographViewerProps {
  caseId: string;
}

export const RadiographViewer: React.FC<RadiographViewerProps> = ({ caseId }) => {
  const { radiographs, loading, error, remove, getSignedUrl } = useRadiographs({ caseId });
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

  const handleRemove = async (item: RadiographItem) => {
    if (confirm(`Remover ${item.filename}?`)) {
      await remove(item.id);
    }
  };

  const handleView = async (item: RadiographItem) => {
    const url = await getSignedUrl(item.filepath);
    if (url) setSelectedSrc(url);
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="text-red-500">Erro: {error.message}</div>;

  return (
    <div className="space-y-4">
      <RadiographUploader caseId={caseId} />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {radiographs.map((item) => (
          <div key={item.id} className="border p-2 rounded flex flex-col gap-2">
            <div className="h-24 bg-gray-100 flex items-center justify-center text-xs truncate p-1">
              {item.filename}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleView(item)} className="text-blue-600 text-sm">Visualizar</button>
              <button onClick={() => handleRemove(item)} className="text-red-600 text-sm">Remover</button>
            </div>
          </div>
        ))}
      </div>

      {selectedSrc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedSrc(null)}>
          <img src={selectedSrc} alt="Radiografia" className="max-w-full max-h-full rounded" />
        </div>
      )}
    </div>
  );
};
