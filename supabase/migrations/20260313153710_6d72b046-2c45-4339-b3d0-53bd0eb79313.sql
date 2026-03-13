
-- Fix permissive RLS policy on avisos UPDATE
-- Only allow users to update the lido_por array (mark as read)
DROP POLICY IF EXISTS "Users can mark avisos as read" ON public.avisos;

-- More restrictive: users can only update avisos, but admin policies already handle full access
-- For regular users, we don't need a separate update policy since they only read avisos
-- The admin "Admins can manage avisos" policy already covers admin updates
