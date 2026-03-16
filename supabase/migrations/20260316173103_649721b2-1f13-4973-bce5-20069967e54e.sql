CREATE TABLE public.reposicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 days')
);

CREATE TABLE public.reposicao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reposicao_id UUID NOT NULL REFERENCES public.reposicoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  requires_color BOOLEAN NOT NULL DEFAULT false,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (reposicao_id, nome)
);

CREATE TABLE public.reposicao_respostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reposicao_item_id UUID NOT NULL REFERENCES public.reposicao_itens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  color_detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (reposicao_item_id, user_id)
);

CREATE INDEX idx_reposicoes_expires_at ON public.reposicoes(expires_at);
CREATE INDEX idx_reposicao_itens_reposicao_id ON public.reposicao_itens(reposicao_id, sort_order);
CREATE INDEX idx_reposicao_respostas_item_id ON public.reposicao_respostas(reposicao_item_id);
CREATE INDEX idx_reposicao_respostas_user_id ON public.reposicao_respostas(user_id);

ALTER TABLE public.reposicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposicao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposicao_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e escala podem gerenciar reposicoes"
ON public.reposicoes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'escala'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'escala'));

CREATE POLICY "Autenticados podem ver reposicoes ativas e admins historico"
ON public.reposicoes
FOR SELECT
TO authenticated
USING (
  expires_at >= now()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'escala')
);

CREATE POLICY "Admins e escala podem gerenciar itens de reposicao"
ON public.reposicao_itens
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'escala'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'escala'));

CREATE POLICY "Autenticados podem ver itens de reposicoes permitidas"
ON public.reposicao_itens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reposicoes r
    WHERE r.id = reposicao_id
      AND (
        r.expires_at >= now()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'escala')
      )
  )
);

CREATE POLICY "Usuarios podem ver proprias respostas e admins todas"
ON public.reposicao_respostas
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'escala')
);

CREATE POLICY "Usuarios podem inserir respostas proprias em reposicoes ativas"
ON public.reposicao_respostas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.reposicao_itens i
    JOIN public.reposicoes r ON r.id = i.reposicao_id
    WHERE i.id = reposicao_item_id
      AND r.expires_at >= now()
  )
);

CREATE POLICY "Usuarios podem atualizar respostas proprias e admins qualquer uma"
ON public.reposicao_respostas
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'escala')
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'escala')
);

CREATE POLICY "Usuarios podem excluir respostas proprias e admins qualquer uma"
ON public.reposicao_respostas
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'escala')
);

CREATE TRIGGER update_reposicoes_updated_at
BEFORE UPDATE ON public.reposicoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reposicao_respostas_updated_at
BEFORE UPDATE ON public.reposicao_respostas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();