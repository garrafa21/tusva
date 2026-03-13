ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'escala';

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
  SET lido_por = CASE
    WHEN _uid = ANY(COALESCE(lido_por, '{}'::uuid[])) THEN COALESCE(lido_por, '{}'::uuid[])
    ELSE array_append(COALESCE(lido_por, '{}'::uuid[]), _uid)
  END
  WHERE id = _aviso_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aviso não encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_server_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;