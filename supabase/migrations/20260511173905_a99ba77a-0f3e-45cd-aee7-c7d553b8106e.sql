
-- 1. Aniversariantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_nascimento date;

-- 2. Pedidos de firmeza
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active prayer requests"
ON public.prayer_requests FOR SELECT TO authenticated
USING (expires_at >= now() OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own prayer requests"
ON public.prayer_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own prayer requests"
ON public.prayer_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete prayer requests"
ON public.prayer_requests FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Suportes (quem está firmando)
CREATE TABLE IF NOT EXISTS public.prayer_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);
ALTER TABLE public.prayer_supports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view supports"
ON public.prayer_supports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own support"
ON public.prayer_supports FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own support"
ON public.prayer_supports FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 4. Banhos & Ervas
CREATE TABLE IF NOT EXISTS public.ervas_banhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint CHECK (dia_semana BETWEEN 0 AND 6),
  linha text,
  titulo text NOT NULL,
  descricao text,
  finalidade text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ervas_banhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ervas"
ON public.ervas_banhos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ervas"
ON public.ervas_banhos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
