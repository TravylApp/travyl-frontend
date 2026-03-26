-- Fix: packing_audit_log.user_id and target_user_id referenced profiles(id) with NO ACTION,
-- blocking user deletion from the admin console.
-- Cascade from auth.users → profiles was being blocked because audit log rows held
-- a hard FK reference to the profile being deleted.
-- Changed to SET NULL to preserve audit history while allowing user deletion.

ALTER TABLE public.packing_audit_log
  DROP CONSTRAINT packing_audit_log_user_id_fkey,
  ADD CONSTRAINT packing_audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.packing_audit_log
  DROP CONSTRAINT packing_audit_log_target_user_id_fkey,
  ADD CONSTRAINT packing_audit_log_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
