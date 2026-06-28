// src/hooks/useRadiographs.ts
import { useState, useCallback, useEffect } from 'react';
import { supabase, getSignedImageUrl } from '../services/supabase';
// import { Database } from '../types/supabase'; // Removido temporariamente por erro de path

export interface RadiographItem {
  id: string;
  filepath: string;
  filename: string;
  size_bytes: number;
  mime: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface UseRadiographsProps {
  caseId: string;
}

export const useRadiographs = ({ caseId }: UseRadiographsProps) => {
  const [radiographs, setRadiographs] = useState<RadiographItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRadiographs = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clinical_cases')
      .select('radiographs')
      .eq('id', caseId)
      .single();

    if (error) {
      setError(error as unknown as Error);
    } else {
      setRadiographs((data?.radiographs as RadiographItem[]) || []);
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    fetchRadiographs();
  }, [fetchRadiographs]);

  const upload = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `xrays/${caseId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('radiografias')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const newItem: RadiographItem = {
        id: crypto.randomUUID(),
        filepath: filePath,
        filename: file.name,
        size_bytes: file.size,
        mime: file.type,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id || '',
        uploaded_at: new Date().toISOString(),
      };

      const { data: currentCase } = await supabase
        .from('clinical_cases')
        .select('radiographs')
        .eq('id', caseId)
        .single();

      const updatedList = [...((currentCase?.radiographs as RadiographItem[]) || []), newItem];

      const { error: updateError } = await supabase
        .from('clinical_cases')
        .update({ radiographs: updatedList })
        .eq('id', caseId);

      if (updateError) throw updateError;
      await fetchRadiographs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Upload failed'));
    } finally {
      setLoading(false);
    }
  }, [caseId, fetchRadiographs]);

  const remove = useCallback(async (radiographId: string) => {
    const item = radiographs.find(r => r.id === radiographId);
    if (!item) return;

    setLoading(true);
    try {
      await supabase.storage.from('radiografias').remove([item.filepath]);
      const updatedList = radiographs.filter(r => r.id !== radiographId);

      await supabase.from('clinical_cases').update({ radiographs: updatedList }).eq('id', caseId);
      await fetchRadiographs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Removal failed'));
    } finally {
      setLoading(false);
    }
  }, [caseId, radiographs, fetchRadiographs]);

  return { radiographs, loading, error, upload, remove, getSignedUrl: getSignedImageUrl };
};
