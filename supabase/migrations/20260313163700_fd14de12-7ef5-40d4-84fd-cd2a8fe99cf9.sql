
-- Add spiritual line types to tipo_evento enum
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'caboclos';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'pretos_velhos';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'eres';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'baianos';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'marinheiros';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'boiadeiros';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'ciganos';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'malandragem';
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'esquerda';
