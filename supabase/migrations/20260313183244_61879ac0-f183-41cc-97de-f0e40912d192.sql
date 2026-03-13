-- Allow users to mark avisos as read safely without broad UPDATE permission
CREATE OR REPLACE FUNCTION public.mark_aviso_lido(_aviso_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.avisos
  SET lido_por = array_append(lido_por, _uid)
  WHERE id = _aviso_id
    AND NOT (_uid = ANY(lido_por));
END;
$$;

REVOKE ALL ON FUNCTION public.mark_aviso_lido(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_aviso_lido(uuid) TO authenticated;

-- Allow users to report monthly payment intent/status without direct table UPDATE permissions
CREATE OR REPLACE FUNCTION public.set_mensalidade_status(_mensalidade_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _status NOT IN ('paguei', 'vou_atrasar') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  UPDATE public.mensalidades
  SET status = _status,
      data_pagamento = CASE WHEN _status = 'paguei' THEN CURRENT_DATE ELSE NULL END,
      updated_at = now()
  WHERE id = _mensalidade_id
    AND user_id = _uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensalidade não encontrada para este usuário';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_mensalidade_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_mensalidade_status(uuid, text) TO authenticated;