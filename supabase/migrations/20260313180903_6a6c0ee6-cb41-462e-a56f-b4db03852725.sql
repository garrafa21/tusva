-- Entidades: suportar estrutura por médium > linha > entidade > detalhes
ALTER TABLE public.entidades
ADD COLUMN IF NOT EXISTS medium_user_id uuid,
ADD COLUMN IF NOT EXISTS como_trabalha text,
ADD COLUMN IF NOT EXISTS elementos text;

CREATE INDEX IF NOT EXISTS idx_entidades_medium_user_id ON public.entidades (medium_user_id);
CREATE INDEX IF NOT EXISTS idx_entidades_categoria ON public.entidades (categoria);

-- Mensalidades: apenas admin pode atualizar (evita filho marcar como pago)
DROP POLICY IF EXISTS "Users can update own mensalidades" ON public.mensalidades;
CREATE POLICY "Admins can update mensalidades"
ON public.mensalidades
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Realtime para notificações em tempo real no app
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'avisos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'eventos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'escalas_limpeza'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.escalas_limpeza;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cambones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cambones;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'funcoes_gira'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.funcoes_gira;
  END IF;
END $$;