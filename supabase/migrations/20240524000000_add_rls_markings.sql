-- Garante RLS ativo na tabela
ALTER TABLE clinical_cases ENABLE ROW LEVEL SECURITY;

-- Policy: veterinário só acessa seus próprios casos
CREATE POLICY "Users can view own cases"
  ON clinical_cases FOR SELECT
  USING (auth.uid() = veterinarian_id);

CREATE POLICY "Users can insert own cases"
  ON clinical_cases FOR INSERT
  WITH CHECK (auth.uid() = veterinarian_id);

CREATE POLICY "Users can update own cases"
  ON clinical_cases FOR UPDATE
  USING (auth.uid() = veterinarian_id);

CREATE POLICY "Users can delete own cases"
  ON clinical_cases FOR DELETE
  USING (auth.uid() = veterinarian_id);
