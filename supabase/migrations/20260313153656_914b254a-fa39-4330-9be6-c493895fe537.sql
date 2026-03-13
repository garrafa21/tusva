
-- ========================================
-- TUSVA - Terreiro de Umbanda Senhora dos Ventos e das Almas
-- Full database schema
-- ========================================

-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'membro');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'membro',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  nome_espiritual TEXT,
  telefone TEXT,
  avatar_url TEXT,
  data_entrada DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Eventos table (giras, festas, reunioes)
CREATE TYPE public.tipo_evento AS ENUM ('gira', 'festa', 'reuniao', 'outro');

CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo tipo_evento NOT NULL DEFAULT 'gira',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  local TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- 5. Escalas de limpeza
CREATE TABLE public.escalas_limpeza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  descricao TEXT,
  responsaveis UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.escalas_limpeza ENABLE ROW LEVEL SECURITY;

-- 6. Avisos
CREATE TYPE public.prioridade_aviso AS ENUM ('normal', 'importante', 'urgente');

CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  prioridade prioridade_aviso NOT NULL DEFAULT 'normal',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lido_por UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- 7. Categorias de estudo
CREATE TABLE public.categorias_estudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorias_estudo ENABLE ROW LEVEL SECURITY;

-- 8. Estudos
CREATE TABLE public.estudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  imagem_url TEXT,
  categoria_id UUID REFERENCES public.categorias_estudo(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estudos ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- user_roles: admin can do everything, users can read own
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- profiles: users see all profiles, update own, admin can insert
CREATE POLICY "Authenticated can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- eventos: all authenticated can read, admin can manage
CREATE POLICY "Authenticated can view eventos" ON public.eventos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage eventos" ON public.eventos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- escalas_limpeza: all authenticated can read, admin can manage
CREATE POLICY "Authenticated can view escalas" ON public.escalas_limpeza
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage escalas" ON public.escalas_limpeza
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- avisos: all authenticated can read, admin can manage
CREATE POLICY "Authenticated can view avisos" ON public.avisos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage avisos" ON public.avisos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- avisos: users can update lido_por (mark as read)
CREATE POLICY "Users can mark avisos as read" ON public.avisos
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- categorias_estudo: all can read, admin can manage
CREATE POLICY "Authenticated can view categorias" ON public.categorias_estudo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categorias" ON public.categorias_estudo
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- estudos: all can read, admin can manage
CREATE POLICY "Authenticated can view estudos" ON public.estudos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage estudos" ON public.estudos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================================
-- TRIGGERS for updated_at
-- ========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escalas_updated_at
  BEFORE UPDATE ON public.escalas_limpeza
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estudos_updated_at
  BEFORE UPDATE ON public.estudos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- TRIGGER to auto-create profile on signup
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
