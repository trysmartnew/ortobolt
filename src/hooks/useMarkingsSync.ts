import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { MarkingsData } from '../types/markings';
import { validateMarkings } from '../schemas/markings';

interface UseMarkingsSyncProps { caseId: string; examId?: string; }
interface UseMarkingsSyncReturn {
  loadMarkings: () => Promise<MarkingsData | null>;
  saveMarkings: (newMarkings: MarkingsData) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}

export function useMarkingsSync({ caseId, examId }: UseMarkingsSyncProps): UseMarkingsSyncReturn {
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
        return validateMarkings(markings) || null;
      }
      
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
      const updatedExams = (currentCase.exams as any[]).map((e: any) => 
        e.id === examId 
          ? { ...e, markings: validated, markedAt: new Date().toISOString() }
          : e
      );

      const { error: updateError } = await supabase
        .from('clinical_cases')
        .update({ exams: updatedExams })
        .eq('id', caseId);

      if (updateError) setError(updateError.message);
      else setLastSavedAt(new Date());
    } else {
      // Fallback legado
      const { error: updateError } = await supabase
        .from('clinical_cases')
        .update({ markings: validated })
        .eq('id', caseId);

      if (updateError) setError(updateError.message);
      else setLastSavedAt(new Date());
    }
    
    setIsSaving(false);
  };

  const saveMarkings = useCallback((newMarkings: MarkingsData) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => performSave(newMarkings), 1500);
  }, [caseId, examId]);

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  return { loadMarkings, saveMarkings, isSaving, lastSavedAt, error };
}
