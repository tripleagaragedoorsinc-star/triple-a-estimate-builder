/*
# Create auth users and member records

Creates three auth users for the Triple A Garage Doors app:
1. Owner: avic@tripleagaragedoorsinc.com
2. Admin: admin@tripleagaragedoorsinc.com
3. Sales: sales@tripleagaragedoorsinc.com

Uses extensions.gen_salt and extensions.crypt for bcrypt password hashing.
*/

CREATE OR REPLACE FUNCTION public.create_auth_user(
  p_email text,
  p_password text,
  p_role text,
  p_full_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = p_email;
  IF v_existing IS NOT NULL THEN
    INSERT INTO eb_members (user_id, role, email, full_name, active)
    VALUES (v_existing, p_role, p_email, p_full_name, true)
    ON CONFLICT (user_id) DO UPDATE SET role = p_role, email = p_email, full_name = p_full_name, active = true;
    RETURN v_existing;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    email_change_confirm_status
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('role', p_role),
    jsonb_build_object('full_name', p_full_name),
    '',
    0
  ) RETURNING id INTO v_user_id;

  INSERT INTO eb_members (user_id, role, email, full_name, active)
  VALUES (v_user_id, p_role, p_email, p_full_name, true)
  ON CONFLICT (user_id) DO UPDATE SET role = p_role, email = p_email, full_name = p_full_name, active = true;

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_auth_user(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_auth_user(text, text, text, text) TO authenticated;

SELECT public.create_auth_user('avic@tripleagaragedoorsinc.com', 'TripleA2026!', 'owner', 'Avic (Owner)');
SELECT public.create_auth_user('admin@tripleagaragedoorsinc.com', 'TripleA2026!', 'admin', 'Site Admin');
SELECT public.create_auth_user('sales@tripleagaragedoorsinc.com', 'TripleA2026!', 'sales', 'Sales Rep');

DROP FUNCTION IF EXISTS public.create_auth_user(text, text, text, text);
