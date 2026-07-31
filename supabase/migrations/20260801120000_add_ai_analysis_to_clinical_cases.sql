-- Migration: add_ai_analysis_to_clinical_cases
-- Purpose: Cria a coluna ai_analysis que o código já escreve
--          (AppContext.tsx L529: dbUpdates.ai_analysis = enriched.aiAnalysis)
--          mas que nunca foi criada via migration.
-- Date: 2026-08-01
-- Idempotent: YES
-- RLS: já ativo na tabela (migration 20240524000000_add_rls_markings.sql)

ALTER TABLE public.clinical_cases
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL;

COMMENT ON COLUMN public.clinical_cases.ai_analysis IS
  'Resultado estruturado da análise IA (AIResult). Escrito pelo AppContext na aprovação/atualização do caso. Fonte canônica para output clínico da IA.';
