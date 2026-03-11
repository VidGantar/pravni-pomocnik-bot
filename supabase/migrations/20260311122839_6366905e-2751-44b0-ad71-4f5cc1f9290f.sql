
-- Allow support users to update documents (needed to append to "pretekla vprašanja")
CREATE POLICY "Support can update documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'support'::app_role))
WITH CHECK (has_role(auth.uid(), 'support'::app_role));

-- Allow support users to insert FAQ entries
CREATE POLICY "Support can insert FAQ"
ON public.faq_entries
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'support'::app_role));
