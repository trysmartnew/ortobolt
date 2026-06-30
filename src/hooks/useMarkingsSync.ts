import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, updateCaseMarkings } from '../services/supabase';
import type { MarkingsData } from '../types/markings';
import { validateMarkings } from '../schemas/markings';

interface UseMarkingsSyncProps { caseId: string; examId?: string; }
interface UseMarkingsSyncReturn {
  loadMarkings: () => Promise<MarkingsData | null>;
  saveMarkings: (newMarkings: MarkingsData) => void;
  markings: MarkingsData | null;
  setMarkings: (markings: MarkingsData | null) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}

export function useMarkingsSync({ caseId, examId }: UseMarkingsSyncProps): UseMarkingsSyncReturn {
  const [markings, setMarkings] = useState<MarkingsData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const loadMarkings = useCallback(async (): Promise<MarkingsData | null> => {
    if (!caseId) return null;
    setError(null);
    try {
      const { data, error } = await supabase.from('clinical_cases').select('exams').eq('id', caseId).single();
      if (error) throw error;
      
      if (examId && data?.exams) {
        const exam = (data.exams as any[]).find((e: any) => e.id === examId);
        const markings = exam?.markings;
        const validated = validateMarkings(markings) || null;
        setMarkings(validated);
        return validated;
      }
      
      setMarkings(null);
      return null;
    } catch (err: any) { setError(err.message); return null; }
  }, [caseId, examId]);

  const performSave = async (newMarkings: MarkingsData) => {
    if (!caseId) return;
    
    const validated = validateMarkings(newMarkings);
    if (!validated) {
      setError('Marcações inválidas');
      return;
    }

    setIsSaving(true); 
    setError(null);
    
    const { data: currentCase, error: fetchError } = await supabase
      .from('clinical_cases')
      .select('exams')
      .eq('id', caseId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setIsSaving(false);
      return;
    }

    // ✅ Se examId, atualizar no exam específico; senão, salvar na raiz (legado)
    if (examId && currentCase?.exams) {
      const previousMarkings = markings;
      const updatedExams = (currentCase.exams as any[]).map((e: any) => 
        e.id === examId 
          ? { ...e, markings: validated, markedAt: new Date().toISOString() }
          : e
      );

      const { error: updateError } = await supabase
        .from('clinical_cases')
        .update({ exams: updatedExams })
        .eq('id', caseId);

      if (updateError) {
        setError(updateError.message);
        setMarkings(previousMarkings);
        console.error('[useMarkingsSync] Falha ao salvar — estado restaurado');
      } else {
        setMarkings(validated);
        setLastSavedAt(new Date());
      }
    } else {
      // Fallback legado
      const previousMarkings = markings;
      try {
        await updateCaseMarkings(caseId, validated);
        setMarkings(validated);
        setLastSavedAt(new Date());
      } catch (updateError: any) {
        setError(updateError.message);
        setMarkings(previousMarkings);
        console.error('[useMarkingsSync] Falha ao salvar — estado restaurado');
      }
    }
    
    setIsSaving(false);
  };

  const saveMarkings = useCallback((newMarkings: MarkingsData) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => performSave(newMarkings), 1500);
  }, [caseId, examId]);

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  return { loadMarkings, saveMarkings, markings, setMarkings, isSaving, lastSavedAt, error };
}
