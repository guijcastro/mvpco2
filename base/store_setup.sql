-- Atribui uma "Loja Teste" se não especificado
ALTER TABLE public.audio_files 
ADD COLUMN IF NOT EXISTS store_id TEXT;

-- Atualiza os áudios antigos que não tinham loja
UPDATE public.audio_files 
SET store_id = 'Loja Central' 
WHERE store_id IS NULL;

-- Garante que o campo não fique nulo daqui em diante
ALTER TABLE public.audio_files 
ALTER COLUMN store_id SET DEFAULT 'Loja Central';
