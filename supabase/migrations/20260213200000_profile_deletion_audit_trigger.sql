-- ---------------------------------------------------------------------------
-- AUDIT: Log profile deletions for fraud prevention
-- Tracks account wipes (cascade from auth.users delete) and explicit profile deletes.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_profile_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Store deleted_profile_id in metadata; target_id gets nulled when profile is removed
  INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
  VALUES (
    auth.uid(),
    'profiles.deleted',
    OLD.id,
    jsonb_build_object('role', OLD.role, 'deleted_profile_id', OLD.id)
  );
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.log_profile_deletion() IS
  'Audit trigger: logs profile deletions (including cascade from auth.users) for fraud prevention.';

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_deletion();
