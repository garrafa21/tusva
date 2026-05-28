
CREATE TABLE public.pontos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  letra text NOT NULL,
  linha text,
  audio_url text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pontos TO authenticated;
GRANT ALL ON public.pontos TO service_role;

ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pontos" ON public.pontos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pontos" ON public.pontos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pontos_updated_at BEFORE UPDATE ON public.pontos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('pontos-audio', 'pontos-audio', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Pontos audio public read" ON storage.objects FOR SELECT USING (bucket_id = 'pontos-audio');
CREATE POLICY "Admins upload pontos audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pontos-audio' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update pontos audio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pontos-audio' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete pontos audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pontos-audio' AND has_role(auth.uid(), 'admin'::app_role));
