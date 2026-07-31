-- Storage RLS para bucket case-images
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política: usuário pode fazer upload de arquivos em seu diretório
CREATE POLICY "Users can upload own case images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: usuário pode ler seus próprios arquivos
CREATE POLICY "Users can view own case images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: usuário pode deletar seus próprios arquivos
CREATE POLICY "Users can delete own case images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
