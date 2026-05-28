
-- 1. profiles_private para telefone
CREATE TABLE public.profiles_private (
  user_id uuid PRIMARY KEY,
  telefone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles_private TO authenticated;
GRANT ALL ON public.profiles_private TO service_role;

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view phone"
  ON public.profiles_private FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can insert phone"
  ON public.profiles_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can update phone"
  ON public.profiles_private FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete phone"
  ON public.profiles_private FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Migra dados existentes
INSERT INTO public.profiles_private (user_id, telefone)
SELECT user_id, telefone FROM public.profiles WHERE telefone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN telefone;

-- 2. reposicao_respostas: restringir SELECT
DROP POLICY IF EXISTS "Todos autenticados podem ver respostas" ON public.reposicao_respostas;

CREATE POLICY "Owner admin escala podem ver respostas"
  ON public.reposicao_respostas FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'escala'::app_role)
  );

-- 3. Storage: ervas — apenas admins gerenciam
DROP POLICY IF EXISTS "Authenticated can upload ervas images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update ervas images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete ervas images" ON storage.objects;

CREATE POLICY "Admins upload ervas images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ervas' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update ervas images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ervas' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete ervas images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ervas' AND has_role(auth.uid(), 'admin'::app_role));

-- 4. Storage: avatars — adicionar DELETE com checagem de pasta
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
