-- PENDING: NOT yet applied to production. Run in Supabase Dashboard > SQL Editor,
-- or ask Claude to apply it once you have approved it.
--
-- Problem: handle_new_user() attached EVERY new auth user (storefront customers,
-- Google sign-ins, anyone calling the public signup API) to the first/master store
-- with role 'Owner'. Middleware and requireStaff() treat that as staff access.
--
-- Fix: new users get store_id = NULL (no ERP access). The register flow
-- (app/(auth)/register/page.tsx) already creates the shop and upserts the profile
-- with store_id + role 'Owner' right after signup, and store/useAuthStore.ts already
-- handles profiles without a store_id.
--
-- After applying: do one test registration of a new store, and one test Google
-- sign-in on the storefront, to confirm both still work.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1));
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'Owner');

  INSERT INTO public.profiles (
    id, full_name, email, phone, role, store_id, branch_id, is_active
  )
  VALUES (
    NEW.id, v_full_name, COALESCE(NEW.email, ''), v_phone, v_role, NULL, NULL, true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
