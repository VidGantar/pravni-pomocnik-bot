CREATE POLICY "Authenticated can view support roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'support'::app_role);