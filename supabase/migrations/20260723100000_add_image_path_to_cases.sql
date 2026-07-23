ALTER TABLE public.clinical_cases
ADD COLUMN image_path TEXT;

COMMENT ON COLUMN public.clinical_cases.image_path IS 'The path to the radiograph object in the storage bucket. Replaces the volatile imageUrl.';

-- Nota para o time de desenvolvimento:
-- O preenchimento retroativo (back-filling) desta coluna a partir da antiga coluna "imageUrl" 
-- deve ser feito através de um script separado para garantir a segurança dos dados existentes.
--
-- Exemplo de script de back-fill (a ser adaptado conforme a estrutura da URL):
-- UPDATE public.clinical_cases
-- SET image_path = substring("imageUrl" from 'https/supabase-url/storage/v1/object/public/case-images/(.*?)?token=')
-- WHERE image_path IS NULL AND "imageUrl" LIKE '%/case-images/%';
--
-- Após o back-filling e a implantação do novo código em produção, a coluna "imageUrl" poderá ser removida em uma migração futura.
-- Ex: ALTER TABLE public.clinical_cases DROP COLUMN "imageUrl";
