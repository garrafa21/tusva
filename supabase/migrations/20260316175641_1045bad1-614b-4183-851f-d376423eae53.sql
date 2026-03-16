-- Add status column to reposicoes (ativa, concluida)
ALTER TABLE public.reposicoes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins e escala podem gerenciar reposicoes" ON public.reposicoes;
DROP POLICY IF EXISTS "Autenticados podem ver reposicoes ativas e admins historico" ON public.reposicoes;

-- All authenticated users can create reposicoes
CREATE POLICY "Autenticados podem criar reposicoes"
ON public.reposicoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Creator, admins and escala can update/delete
CREATE POLICY "Criador admins escala podem gerenciar reposicoes"
ON public.reposicoes FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'escala'::app_role));

CREATE POLICY "Criador admins escala podem excluir reposicoes"
ON public.reposicoes FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'escala'::app_role));

-- All authenticated can view active; admins/escala/creator can see archived
CREATE POLICY "Autenticados podem ver reposicoes ativas e admins historico v2"
ON public.reposicoes FOR SELECT TO authenticated
USING (
  (status = 'ativa' AND expires_at >= now())
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'escala'::app_role)
);

-- Allow creator to add/delete items
DROP POLICY IF EXISTS "Admins e escala podem gerenciar itens de reposicao" ON public.reposicao_itens;

CREATE POLICY "Criador pode gerenciar itens de reposicao"
ON public.reposicao_itens FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM reposicoes r WHERE r.id = reposicao_itens.reposicao_id AND (r.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'escala'::app_role)))
);

CREATE POLICY "Criador pode excluir itens custom"
ON public.reposicao_itens FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM reposicoes r WHERE r.id = reposicao_itens.reposicao_id AND (r.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'escala'::app_role)))
);

-- Update itens SELECT policy
DROP POLICY IF EXISTS "Autenticados podem ver itens de reposicoes permitidas" ON public.reposicao_itens;
CREATE POLICY "Autenticados podem ver itens de reposicoes permitidas v2"
ON public.reposicao_itens FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM reposicoes r WHERE r.id = reposicao_itens.reposicao_id AND (
    (r.status = 'ativa' AND r.expires_at >= now())
    OR r.created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'escala'::app_role)
  ))
);

-- Update respostas INSERT to check status
DROP POLICY IF EXISTS "Usuarios podem inserir respostas proprias em reposicoes ativas" ON public.reposicao_respostas;
CREATE POLICY "Usuarios podem inserir respostas proprias em reposicoes ativas v2"
ON public.reposicao_respostas FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM reposicao_itens i JOIN reposicoes r ON r.id = i.reposicao_id
    WHERE i.id = reposicao_respostas.reposicao_item_id AND r.status = 'ativa' AND r.expires_at >= now()
  )
);