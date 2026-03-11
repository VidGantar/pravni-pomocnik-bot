
CREATE OR REPLACE FUNCTION public.reassign_ticket(
  _ticket_id uuid,
  _new_assignee uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _conv_id uuid;
BEGIN
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

  SELECT t.conversation_id INTO _conv_id FROM public.tickets t WHERE t.id = _ticket_id;

  UPDATE public.tickets SET assigned_to = _new_assignee, updated_at = now() WHERE id = _ticket_id;

  IF _conv_id IS NOT NULL THEN
    UPDATE public.conversations SET assigned_to = _new_assignee, updated_at = now() WHERE id = _conv_id;
  END IF;
END;
$$;
