DROP POLICY IF EXISTS "No access to notification vapid keys (select)" ON public.notification_vapid_keys;
CREATE POLICY "No access to notification vapid keys (select)"
ON public.notification_vapid_keys
FOR SELECT
TO authenticated
USING (false);

DROP POLICY IF EXISTS "No access to notification vapid keys (insert)" ON public.notification_vapid_keys;
CREATE POLICY "No access to notification vapid keys (insert)"
ON public.notification_vapid_keys
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No access to notification vapid keys (update)" ON public.notification_vapid_keys;
CREATE POLICY "No access to notification vapid keys (update)"
ON public.notification_vapid_keys
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No access to notification vapid keys (delete)" ON public.notification_vapid_keys;
CREATE POLICY "No access to notification vapid keys (delete)"
ON public.notification_vapid_keys
FOR DELETE
TO authenticated
USING (false);