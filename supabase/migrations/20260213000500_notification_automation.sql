-- ---------------------------------------------------------------------------
-- AUTOMATED NOTIFICATIONS ENHANCEMENTS
-- ---------------------------------------------------------------------------

-- 1. Notification for New Lead Creation
-- Notifies the landlord when a renter clicks "Express Interest"
CREATE OR REPLACE FUNCTION public.notify_on_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  target_landlord_id UUID;
  property_address TEXT;
  renter_name TEXT;
BEGIN
  -- Get property details
  SELECT landlord_id, address INTO target_landlord_id, property_address
  FROM public.properties
  WHERE id = NEW.property_id;

  -- Get renter name
  SELECT COALESCE(full_name, 'A new renter') INTO renter_name 
  FROM public.profiles 
  WHERE id = NEW.renter_id;

  INSERT INTO public.notifications (user_id, type, title, content, metadata)
  VALUES (
    target_landlord_id,
    'lead_update',
    'New Lead Received',
    renter_name || ' is interested in your property: ' || property_address,
    jsonb_build_object('lead_id', NEW.id, 'property_id', NEW.property_id, 'event', 'new_lead')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new lead
DROP TRIGGER IF EXISTS on_new_lead_created ON public.leads;
CREATE TRIGGER on_new_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_lead();

-- 2. Enhanced Lead Status Change (specifically for 'Lease Sent')
-- We update the existing function to be more descriptive for specific transitions
CREATE OR REPLACE FUNCTION public.notify_on_lead_status_update()
RETURNS TRIGGER AS $$
DECLARE
  property_address TEXT;
  notif_title TEXT;
  notif_content TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT address INTO property_address FROM public.properties WHERE id = NEW.property_id;

    -- Custom messaging for Lease Sent
    IF NEW.status = 'Lease Sent' THEN
      notif_title := '📄 Lease Ready for Review';
      notif_content := 'Good news! A lease has been sent for ' || property_address || '. Please review it in your dashboard.';
    ELSE
      notif_title := 'Lead Status Updated';
      notif_content := 'Your lead status for ' || property_address || ' has been updated to ' || NEW.status;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, content, metadata)
    VALUES (
      NEW.renter_id,
      'lead_update',
      notif_title,
      notif_content,
      jsonb_build_object('lead_id', NEW.id, 'property_id', NEW.property_id, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger (it was defined in the previous migration, but we ensure it uses the updated function)
DROP TRIGGER IF EXISTS on_lead_status_update ON public.leads;
CREATE TRIGGER on_lead_status_update
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_lead_status_update();

-- 3. Review/Confirm Message Trigger
-- The notify_on_new_message trigger from the previous migration already covers message insertions.
-- We ensure it's functioning as expected.
