import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import type { ClinicalEvidence } from '@/schemas/clinicalEvidence';

/**
 * Hook para sincronização incremental de evidências clínicas (CEP Fase 2)
 * Isola o Realtime por caseId para evitar re-renders globais
 */
export function useCaseRealtime(caseId: string, onUpdate: (evidence: ClinicalEvidence) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`case:${caseId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'clinical_cases', 
          filter: `id=eq.${caseId}` 
        },
        (payload) => {
          if (payload.new && payload.new.clinicalEvidence) {
            onUpdate(payload.new.clinicalEvidence as ClinicalEvidence);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, onUpdate]);
}
