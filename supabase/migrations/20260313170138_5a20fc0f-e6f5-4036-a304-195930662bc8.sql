
-- Add tipo_escala and funcao columns to escalas_limpeza
ALTER TABLE public.escalas_limpeza ADD COLUMN IF NOT EXISTS tipo_escala text NOT NULL DEFAULT 'fim_de_semana';
ALTER TABLE public.escalas_limpeza ADD COLUMN IF NOT EXISTS funcao text DEFAULT NULL;
