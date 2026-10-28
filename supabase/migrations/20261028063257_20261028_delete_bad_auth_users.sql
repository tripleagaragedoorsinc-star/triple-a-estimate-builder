/*
# Delete manually-created auth users

Remove all three users that were created via direct SQL INSERT.
They will be recreated properly via the Supabase Admin API.
*/

DELETE FROM eb_members WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com');
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com');
DELETE FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com';

-- Verify they're gone
SELECT count(*) AS remaining_users FROM auth.users WHERE email LIKE '%tripleagaragedoorsinc.com';
