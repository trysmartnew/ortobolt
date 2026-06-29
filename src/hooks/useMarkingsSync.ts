import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { MarkingsData } from '../types/markings';

interface UseMarkingsSyncProps { caseId: string; }
interface UseMarkingsSyncReturn {
  loadMarkings: () => Promise<MarkingsData | null>;
  saveMarkings: (newMarkings: MarkingsData) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}

export function useMarkingsSync({ caseId }: UseMarkingsSyncProps): UseMarkingsSyncReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const loadMarkings = useCallback(async (): Promise<MarkingsData | null> => {
    if (!caseId) return null;
    setError(null);
    try {
      const { data, error } = await supabase.from('clinical_cases').select('markings').eq('id', caseId).single();
      if (error) throw error;
      return data?.markings as MarkingsData | null;
    } catch (err: any) { setError(err.message); return null; }
  }, [caseId]);

  const performSave = async (newMarkings: MarkingsData) => {
    if (!caseId) return;
    setIsSaving(true); setError(null);
    const { error: updateError } = await supabase.from('clinical_cases').update({ markings: newMarkings }).eq('id', caseId);
    if (updateError) setError(updateError.message);
    else setLastSavedAt(new Date());
    setIsSaving(false);
  };

  const saveMarkings = useCallback((newMarkings: MarkingsData) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => performSave(newMarkings), 1500);
  }, [caseId]);

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  return { loadMarkings, saveMarkings, isSaving, lastSavedAt, error };
}
