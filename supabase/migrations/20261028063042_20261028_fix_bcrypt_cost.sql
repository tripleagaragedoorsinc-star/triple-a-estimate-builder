/*
# Fix bcrypt password cost factor

The previous gen_salt('bf') produced bcrypt cost 6 ($2a$06$).
GoTrue expects bcrypt cost 10 ($2a$10$). This caused the
"Database error querying schema" error during login because
GoTrue couldn't verify the password hash.

This migration updates all three users' encrypted_password
with the correct bcrypt cost 10 hash.
*/

UPDATE auth.users
SET encrypted_password = crypt('TripleA2026!', extensions.gen_salt('bf', 10))
WHERE email IN (
  'avic@tripleagaragedoorsinc.com',
  'admin@tripleagaragedoorsinc.com',
  'sales@tripleagaragedoorsinc.com'
);

-- Verify the hash format
SELECT email, left(encrypted_password, 7) AS hash_prefix, length(encrypted_password) AS hash_len
FROM auth.users
WHERE email LIKE '%tripleagaragedoorsinc.com'
ORDER BY email;
