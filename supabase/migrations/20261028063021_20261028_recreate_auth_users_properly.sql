/*
# Recreate auth users properly

Deletes the manually-created users that had incomplete schema data,
then recreates them with all required fields. confirmed_at is a generated
column so we skip it (it's derived from email_confirmed_at).
*/

-- Delete existing users
DELETE FROM eb_members WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com');
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com');
DELETE FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com';

-- Recreate with all fields explicitly set (confirmed_at is generated, skip it)
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
  email_change_confirm_status,
  is_sso_user,
  is_anonymous,
  phone,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'avic@tripleagaragedoorsinc.com',
  crypt('TripleA2026!', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  jsonb_build_object('role', 'owner'),
  jsonb_build_object('full_name', 'Avic (Owner)'),
  '',
  0,
  false,
  false,
  NULL,
  '',
  '',
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@tripleagaragedoorsinc.com',
  crypt('TripleA2026!', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  jsonb_build_object('role', 'admin'),
  jsonb_build_object('full_name', 'Site Admin'),
  '',
  0,
  false,
  false,
  NULL,
  '',
  '',
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sales@tripleagaragedoorsinc.com',
  crypt('TripleA2026!', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  jsonb_build_object('role', 'sales'),
  jsonb_build_object('full_name', 'Sales Rep'),
  '',
  0,
  false,
  false,
  NULL,
  '',
  '',
  '',
  ''
)
RETURNING id, email;

-- Insert identities for each user
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  u.id::text,
  u.id,
  jsonb_build_object('email', u.email, 'sub', u.id::text),
  'email',
  NULL,
  now(),
  now()
FROM auth.users u
WHERE u.email LIKE '%tripleagaragedoorsinc.com'
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);

-- Recreate member records
INSERT INTO eb_members (user_id, role, email, full_name, active)
SELECT u.id, u.raw_app_meta_data->>'role', u.email, u.raw_user_meta_data->>'full_name', true
FROM auth.users u
WHERE u.email LIKE '%tripleagaragedoorsinc.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, full_name = EXCLUDED.full_name, active = true;

-- Verify
SELECT u.email, u.email_confirmed_at IS NOT NULL AS confirmed, i.provider, m.role, m.active
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
LEFT JOIN eb_members m ON m.user_id = u.id
WHERE u.email LIKE '%tripleagaragedoorsinc.com'
ORDER BY u.email;
