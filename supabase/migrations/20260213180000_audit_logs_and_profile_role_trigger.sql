-- ---------------------------------------------------------------------------
-- AUDIT LOGS: Table and profile role change trigger
-- ---------------------------------------------------------------------------

CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_target_id ON public.audit_logs(target_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- RLS: No INSERT policy for regular users (only trigger via SECURITY DEFINER inserts)
-- SELECT: Involved parties (actor or target) can view their audit logs
CREATE POLICY "Involved parties can view audit logs"
ON public.audit_logs FOR SELECT
USING (actor_id = auth.uid() OR target_id = auth.uid());

-- Trigger: Log profile role changes
CREATE OR REPLACE FUNCTION public.log_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
    VALUES (
      auth.uid(),
      'profiles.role_changed',
      NEW.id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_role_change();
