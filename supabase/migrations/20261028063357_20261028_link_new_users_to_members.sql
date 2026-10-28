/*
# Link new auth users to eb_members

The three auth users were created via the Supabase Admin API (edge function).
This migration creates their eb_member records with the correct user IDs.
*/

INSERT INTO eb_members (user_id, role, email, full_name, active)
VALUES
('20607c76-b83a-42f9-9859-44ade4946ce5', 'owner', 'avic@tripleagaragedoorsinc.com', 'Avic (Owner)', true),
('0311ecbb-5329-4335-a544-ea4c61389b42', 'admin', 'admin@tripleagaragedoorsinc.com', 'Site Admin', true),
('f69eb1e3-6778-4b2f-a4dd-4adfc18aa29e', 'sales', 'sales@tripleagaragedoorsinc.com', 'Sales Rep', true)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, full_name = EXCLUDED.full_name, active = true;

-- Verify
SELECT m.email, m.role, m.full_name, m.active, u.email_confirmed_at IS NOT NULL AS confirmed
FROM eb_members m
JOIN auth.users u ON u.id = m.user_id
ORDER BY m.role;
