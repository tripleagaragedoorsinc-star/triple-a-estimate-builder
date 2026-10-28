/*
# Fix auth.identities for manually created users

The users created via direct INSERT into auth.users are missing rows in
auth.identities, which Supabase's modern auth flow requires. Without these,
signInWithPassword returns a 500 "Database error querying schema".

The `email` column in auth.identities is a generated column, so we must
not insert into it explicitly.
*/

INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.id::text,
  u.id,
  jsonb_build_object('email', u.email, 'sub', u.id::text),
  'email',
  NULL,
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- Verify
SELECT u.email, count(i.id) AS identity_count
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
GROUP BY u.email
ORDER BY u.email;
