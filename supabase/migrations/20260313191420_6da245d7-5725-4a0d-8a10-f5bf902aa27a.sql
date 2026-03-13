CREATE POLICY "Escala role can manage escalas"
ON public.escalas_limpeza
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'escala'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'escala'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Escala role can manage cambones"
ON public.cambones
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'escala'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'escala'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Escala role can manage funcoes gira"
ON public.funcoes_gira
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'escala'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'escala'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);