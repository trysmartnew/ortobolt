import React, { useState, useRef, ChangeEvent } from 'react';
import { useRadiographs } from '../../hooks/useRadiographs';

interface RadiographUploaderProps {
  caseId: string;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/dicom'];

export const RadiographUploader: React.FC<RadiographUploaderProps> = ({ caseId, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload } = useRadiographs({ caseId });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Arquivo excede ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Tipo de arquivo não permitido.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await upload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message || 'Falha no upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={ALLOWED_MIME_TYPES.join(',')}
        className="hidden"
      />
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isUploading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isUploading ? 'Enviando...' : 'Adicionar Radiografia'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};
