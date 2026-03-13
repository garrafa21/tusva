
-- 1. Confirmações de presença para giras
CREATE TABLE public.confirmacoes_presenca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evento_id, user_id)
);
ALTER TABLE public.confirmacoes_presenca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own confirmacao" ON public.confirmacoes_presenca
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can view confirmacoes" ON public.confirmacoes_presenca
  FOR SELECT TO authenticated USING (true);

-- 2. Cambones (auxiliares das entidades)
CREATE TABLE public.cambones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  medium_user_id uuid NOT NULL,
  cambone_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cambones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage cambones" ON public.cambones
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view cambones" ON public.cambones
  FOR SELECT TO authenticated USING (true);

-- 3. Funções da gira (porteira, senha, apoio congá)
CREATE TABLE public.funcoes_gira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  funcao text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.funcoes_gira ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage funcoes_gira" ON public.funcoes_gira
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view funcoes_gira" ON public.funcoes_gira
  FOR SELECT TO authenticated USING (true);

-- 4. Storage bucket para avatares
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');
