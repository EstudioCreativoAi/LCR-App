-- Create notification type
CREATE TYPE public.notification_type AS ENUM ('new_message', 'lead_update', 'lease_signed');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to handle lead status update notifications
CREATE OR REPLACE FUNCTION public.notify_on_lead_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, content, metadata)
    VALUES (
      NEW.renter_id,
      'lead_update',
      'Lead Status Updated',
      'Your lead status for property ' || (SELECT address FROM public.properties WHERE id = NEW.property_id) || ' has been updated to ' || NEW.status,
      jsonb_build_object('lead_id', NEW.id, 'property_id', NEW.property_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for lead status update
CREATE TRIGGER on_lead_status_update
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_lead_status_update();

-- Function to handle new message notifications
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Find the recipient (the other party in the lead)
  -- If sender is renter, recipient is landlord (or agent)
  -- If sender is landlord/agent, recipient is renter
  
  SELECT 
    CASE 
      WHEN NEW.sender_id = l.renter_id THEN p.landlord_id
      ELSE l.renter_id
    END INTO recipient_id
  FROM public.leads l
  JOIN public.properties p ON l.property_id = p.id
  WHERE l.id = NEW.lead_id;

  SELECT COALESCE(full_name, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, content, metadata)
  VALUES (
    recipient_id,
    'new_message',
    'New Message from ' || sender_name,
    substring(NEW.content from 1 for 100),
    jsonb_build_object('lead_id', NEW.lead_id, 'message_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new message
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();
