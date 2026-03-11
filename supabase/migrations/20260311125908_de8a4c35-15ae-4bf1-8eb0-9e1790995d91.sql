
-- Create a SECURITY DEFINER function for ticket reassignment
-- This bypasses RLS so support can change assigned_to to another user
CREATE OR REPLACE FUNCTION public.reassign_ticket(
  _ticket_id uuid,
  _new_assignee uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is current assignee and has support role
  IF NOT EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = _ticket_id
      AND assigned_to = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to reassign this ticket';
  END IF;

  IF NOT public.has_role(auth.uid(), 'support') THEN
    RAISE EXCEPTION 'Only support users can reassign tickets';
  END IF;

  -- Update ticket assignment
  UPDATE public.tickets
  SET assigned_to = _new_assignee, updated_at = now()
  WHERE id = _ticket_id;

  -- Update linked conversation assignment
  UPDATE public.conversations
  SET assigned_to = _new_assignee, updated_at = now()
  WHERE id = (SELECT conversation_id FROM public.tickets WHERE id = _ticket_id)
    AND conversation_id IS NOT NULL;
END;
$$;
