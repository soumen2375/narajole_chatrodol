-- Migration 0049: Fix database user creation triggers and ensure safe member creation
-- This migration ensures that any trigger on auth.users will safely insert/upsert into cswo_members without throwing unhandled exceptions.

CREATE OR REPLACE FUNCTION public.handle_cswo_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cswo_members (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'member',
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.cswo_members.full_name),
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent auth.users transaction failure on trigger errors
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users if possible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created_cswo ON auth.users;
    CREATE TRIGGER on_auth_user_created_cswo
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_cswo_new_auth_user();
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if permission to auth schema trigger creation is restricted in local environment
  NULL;
END $$;
