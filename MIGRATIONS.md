# Database migration status

- Migration: `20261028_estimate_db`
- Project: `dclsuavrlnaclpvkbrck`
- Applied by Claude with owner approval on 2026-10-28, per its reported read-back.
- Backup schema: `eb_backup_20261028` (seven `eb_` tables and constraints).
- Added application-compatible columns and expanded role/status constraints.
- Seeded 25 catalog rows (24 active; one exceptional-price LI2000 inactive).
- Linked 26 supplier price rows; preserved 45 original supplier prices.
- Created `public.eb_sales_prices` for member-accessible selling prices, excluding supplier costs.
- Added unique indexes for catalog configurations, supplier invoice lines, and order checks.
- Claude reported role tests: Sales 24 view rows, zero supplier costs; Owner 24 view rows and 45 supplier rows; anonymous denied.
- The complete SQL migration was not supplied in this repository; do not reconstruct or reapply it from this note.
- Current app code changes must be build-tested and end-to-end tested before release.
