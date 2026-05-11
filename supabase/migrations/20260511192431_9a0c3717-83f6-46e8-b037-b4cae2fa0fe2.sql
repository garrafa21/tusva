-- Add image and event link to ervas_banhos
ALTER TABLE public.ervas_banhos
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS evento_id uuid;

CREATE INDEX IF NOT EXISTS idx_ervas_banhos_evento ON public.ervas_banhos(evento_id);

-- Public bucket for banho images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ervas', 'ervas', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ervas bucket
CREATE POLICY "Ervas images publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'ervas');

CREATE POLICY "Authenticated can upload ervas images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ervas');

CREATE POLICY "Authenticated can update ervas images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ervas');

CREATE POLICY "Authenticated can delete ervas images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ervas');