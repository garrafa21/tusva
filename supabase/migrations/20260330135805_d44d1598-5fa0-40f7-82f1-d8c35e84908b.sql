-- 1. Allow all authenticated users to see ALL reposicao_respostas (so they see who voted)
DROP POLICY IF EXISTS "Usuarios podem ver proprias respostas e admins todas" ON public.reposicao_respostas;
CREATE POLICY "Todos autenticados podem ver respostas"
  ON public.reposicao_respostas
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow all authenticated users to INSERT their own entidades
DROP POLICY IF EXISTS "Admins can manage entidades" ON public.entidades;

CREATE POLICY "Admins can manage entidades"
  ON public.entidades
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own entidades"
  ON public.entidades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = medium_user_id);

CREATE POLICY "Users can update own entidades"
  ON public.entidades
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = medium_user_id)
  WITH CHECK (auth.uid() = medium_user_id);

CREATE POLICY "Users can delete own entidades"
  ON public.entidades
  FOR DELETE
  TO authenticated
  USING (auth.uid() = medium_user_id);