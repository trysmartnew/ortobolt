-- Migration: Adicionar coluna de marcações aos casos clínicos
-- Tabela: clinical_cases
-- Coluna: markings (JSONB)

ALTER TABLE clinical_cases
ADD COLUMN IF NOT EXISTS markings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN clinical_cases.markings IS
'Marcações visuais: {circles:[], angles:[], markers:[], rois:[]}';
