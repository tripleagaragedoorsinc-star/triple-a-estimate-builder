# Secure workspace integration

The installation estimator prototype is in index.html.

## Authentication
Use Supabase Auth with the project's public publishable key configured at deployment time. Never commit a service-role or secret key.

Authorization is enforced by the eb_members table. An authenticated user must have an owner or sales membership before accessing estimates. Supplier purchase prices are owner-only.

## Next steps
1. Configure Supabase Auth and assign the first owner by verified auth user ID.
2. Add authenticated sign-in and database-backed draft storage.
3. Move pricing calculations to validated application logic and keep supplier cost fields out of sales-facing records.
4. Test owner and sales permissions before entering real supplier prices.
5. Deploy to an HTTPS origin and configure allowed redirect URLs.

Existing servicetitan-bridge Edge Function must remain untouched.
