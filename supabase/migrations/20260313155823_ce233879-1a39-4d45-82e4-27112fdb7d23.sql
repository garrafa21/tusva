
-- Add "desenvolvimento" to tipo_evento enum
ALTER TYPE public.tipo_evento ADD VALUE IF NOT EXISTS 'desenvolvimento';

-- Create entidades table
CREATE TABLE public.entidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view entidades" ON public.entidades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage entidades" ON public.entidades
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Create mensalidades table for financial tracking
CREATE TABLE public.mensalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL, -- format: "2026-03"
  valor numeric NOT NULL DEFAULT 150.00,
  status text NOT NULL DEFAULT 'pendente', -- pendente, pago, atrasado
  data_vencimento date NOT NULL,
  data_pagamento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, mes_referencia)
);

ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mensalidades" ON public.mensalidades
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own mensalidades" ON public.mensalidades
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage mensalidades" ON public.mensalidades
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own mensalidades" ON public.mensalidades
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for mensalidades
CREATE TRIGGER update_mensalidades_updated_at
  BEFORE UPDATE ON public.mensalidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
