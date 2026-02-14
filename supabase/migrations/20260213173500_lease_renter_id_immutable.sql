-- Prevent landlords/agents from reassigning lease renter_id.
-- RLS UPDATE policy allows property owners to update leases but does not restrict
-- which columns they can change; without this trigger they could set renter_id
-- to another user. Only the current renter is allowed to change renter_id
-- (in practice they cannot assign it to someone else without violating other rules).
CREATE OR REPLACE FUNCTION public.leases_deny_renter_id_reassign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.renter_id IS DISTINCT FROM NEW.renter_id THEN
    IF auth.uid() IS DISTINCT FROM OLD.renter_id
       OR NEW.renter_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the current renter may change renter_id on a lease, and only to themselves.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.leases_deny_renter_id_reassign() IS
  'Trigger: blocks updates to leases.renter_id unless the updater is the current renter.';

DROP TRIGGER IF EXISTS lease_renter_id_immutable ON public.leases;
CREATE TRIGGER lease_renter_id_immutable
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.leases_deny_renter_id_reassign();
