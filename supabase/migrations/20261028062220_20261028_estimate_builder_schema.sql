/*
# Create estimate builder database schema

Creates all tables needed by the Triple A Garage Doors Estimate Builder app.
This app has a sign-in screen, so all policies target `authenticated` users.

## 1. New Tables

- `eb_members` — links auth.users to app roles (owner/admin/sales)
  - `user_id` uuid PK, references auth.users(id) ON DELETE CASCADE
  - `role` text NOT NULL CHECK in ('owner','admin','sales')
  - `email` text NOT NULL
  - `full_name` text
  - `active` boolean NOT NULL DEFAULT true
  - `created_at` timestamptz DEFAULT now()

- `eb_catalog` — product catalog (doors, openers, accessories)
  - `id` uuid PK DEFAULT gen_random_uuid()
  - `category` text NOT NULL (door, opener, track, spring, etc.)
  - `manufacturer` text NOT NULL
  - `model` text NOT NULL
  - `sku` text
  - `classification` text CHECK in ('residential','commercial')
  - `width_ft`, `height_ft` numeric
  - `design` text
  - `panel_type` text
  - `color` text
  - `insulation_type` text
  - `r_value`, `steel_thickness`, `track_size`, `track_radius` text
  - `lift_type`, `spring_system`, `spring_cycles`, `door_weight` text
  - `window_option` text
  - `included_hardware`, `optional_accessories` text[]
  - `drive_type`, `horsepower`, `rail_length` text
  - `battery_backup`, `wifi_compatible`, `has_camera` boolean
  - `included_remotes` integer
  - `includes_keypad`, `includes_safety_sensors` boolean
  - `warranty`, `supplier_ordering_notes` text
  - `active` boolean NOT NULL DEFAULT true
  - `created_at` timestamptz DEFAULT now()

- `eb_supplier_prices` — owner-only supplier cost data
  - `id` uuid PK DEFAULT gen_random_uuid()
  - `catalog_id` uuid REFERENCES eb_catalog(id) ON DELETE SET NULL
  - `supplier` text NOT NULL
  - `description` text NOT NULL
  - `size_width`, `size_height` numeric
  - `cost` numeric NOT NULL
  - `price_date` date NOT NULL
  - `source_reference` text
  - `verified` boolean NOT NULL DEFAULT false
  - `created_at` timestamptz DEFAULT now()

- `eb_price_benchmarks` — owner-only pricing benchmarks
  - `id` uuid PK DEFAULT gen_random_uuid()
  - `supplier_price_id` uuid REFERENCES eb_supplier_prices(id) ON DELETE CASCADE
  - `manufacturer`, `model`, `classification` text
  - `width_ft`, `height_ft` numeric
  - `supplier_unit_cost`, `adjusted_cost`, `target_material_price` numeric
  - `quoted_average`, `sold_average` numeric
  - `quote_sample_size`, `sold_sample_size` integer DEFAULT 0
  - `pricing_status` text NOT NULL DEFAULT 'low_confidence'
  - `updated_at` timestamptz DEFAULT now()

- `eb_estimates` — saved estimates
  - `id` uuid PK DEFAULT gen_random_uuid()
  - `created_by` uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
  - `job_reference` text
  - `customer_name`, `customer_phone`, `customer_email`, `service_address` text
  - `status` text NOT NULL DEFAULT 'draft' CHECK in ('draft','sent','sold','dismissed','approved','archived')
  - `subtotal`, `tax`, `total` numeric NOT NULL DEFAULT 0
  - `options` jsonb NOT NULL DEFAULT '{}'
  - `owner_override_price` numeric
  - `owner_override_reason` text
  - `created_at` timestamptz DEFAULT now()
  - `updated_at` timestamptz DEFAULT now()

- `eb_estimate_lines` — line items per estimate
  - `id` uuid PK DEFAULT gen_random_uuid()
  - `estimate_id` uuid NOT NULL REFERENCES eb_estimates(id) ON DELETE CASCADE
  - `line_type` text NOT NULL CHECK in ('door','opener','labor','disposal','accessory','tax')
  - `description` text NOT NULL
  - `quantity` numeric NOT NULL DEFAULT 1
  - `unit_price` numeric NOT NULL DEFAULT 0
  - `line_total` numeric NOT NULL DEFAULT 0
  - `taxable` boolean NOT NULL DEFAULT false

- `eb_order_checks` — order verification checklist per estimate
  - `id` uuid PK DEFAULT gen_random_uuid()
  - `estimate_id` uuid NOT NULL REFERENCES eb_estimates(id) ON DELETE CASCADE
  - `check_key` text NOT NULL
  - `description` text NOT NULL
  - `classification` text NOT NULL DEFAULT 'needs_verification' CHECK in ('included','order_separately','needs_verification','verified')
  - `completed` boolean NOT NULL DEFAULT false
  - `notes` text

## 2. View

- `eb_sales_prices` — member-accessible selling prices (no supplier cost columns)
  Built as a view joining eb_catalog with computed standard/minimum price columns.

## 3. Security (RLS + Grants)

All tables have RLS enabled. Grants and policies:
- `eb_members`: authenticated can SELECT (to find their own role); UPDATE restricted to owner role.
- `eb_catalog`: authenticated can SELECT active items.
- `eb_supplier_prices`: authenticated can SELECT; only owner role can INSERT/UPDATE/DELETE.
- `eb_price_benchmarks`: authenticated can SELECT; only owner role can INSERT/UPDATE/DELETE.
- `eb_estimates`: authenticated CRUD, scoped by created_by = auth.uid().
- `eb_estimate_lines`: authenticated CRUD, scoped through parent estimate ownership.
- `eb_order_checks`: authenticated CRUD, scoped through parent estimate ownership.
- `eb_sales_prices` view: authenticated can SELECT.

## 4. Indexes

- eb_estimates(created_by) — filter by user
- eb_estimate_lines(estimate_id) — join to estimate
- eb_order_checks(estimate_id) — join to estimate
- eb_supplier_prices(catalog_id) — join to catalog
- eb_catalog(manufacturer, model) — search
*/

-- ─── Extensions ───
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── eb_members ───
CREATE TABLE IF NOT EXISTS eb_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','sales')),
  email text NOT NULL,
  full_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE eb_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON eb_members TO authenticated;

DROP POLICY IF EXISTS "select_members" ON eb_members;
CREATE POLICY "select_members" ON eb_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_members_owner" ON eb_members;
CREATE POLICY "update_members_owner" ON eb_members FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

-- ─── eb_catalog ───
CREATE TABLE IF NOT EXISTS eb_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  sku text,
  classification text CHECK (classification IN ('residential','commercial')),
  width_ft numeric,
  height_ft numeric,
  design text,
  panel_type text,
  color text,
  insulation_type text,
  r_value text,
  steel_thickness text,
  track_size text,
  track_radius text,
  lift_type text,
  spring_system text,
  spring_cycles text,
  door_weight text,
  window_option text,
  included_hardware text[],
  optional_accessories text[],
  drive_type text,
  horsepower text,
  rail_length text,
  battery_backup boolean,
  wifi_compatible boolean,
  has_camera boolean,
  included_remotes integer,
  includes_keypad boolean,
  includes_safety_sensors boolean,
  warranty text,
  supplier_ordering_notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE eb_catalog ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON eb_catalog TO authenticated;

DROP POLICY IF EXISTS "select_catalog" ON eb_catalog;
CREATE POLICY "select_catalog" ON eb_catalog FOR SELECT
  TO authenticated USING (active = true);

-- ─── eb_supplier_prices ───
CREATE TABLE IF NOT EXISTS eb_supplier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid REFERENCES eb_catalog(id) ON DELETE SET NULL,
  supplier text NOT NULL,
  description text NOT NULL,
  size_width numeric,
  size_height numeric,
  cost numeric NOT NULL,
  price_date date NOT NULL,
  source_reference text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE eb_supplier_prices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON eb_supplier_prices TO authenticated;

DROP POLICY IF EXISTS "select_supplier_prices" ON eb_supplier_prices;
CREATE POLICY "select_supplier_prices" ON eb_supplier_prices FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

DROP POLICY IF EXISTS "insert_supplier_prices_owner" ON eb_supplier_prices;
CREATE POLICY "insert_supplier_prices_owner" ON eb_supplier_prices FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

DROP POLICY IF EXISTS "update_supplier_prices_owner" ON eb_supplier_prices;
CREATE POLICY "update_supplier_prices_owner" ON eb_supplier_prices FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

DROP POLICY IF EXISTS "delete_supplier_prices_owner" ON eb_supplier_prices;
CREATE POLICY "delete_supplier_prices_owner" ON eb_supplier_prices FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

-- ─── eb_price_benchmarks ───
CREATE TABLE IF NOT EXISTS eb_price_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_price_id uuid REFERENCES eb_supplier_prices(id) ON DELETE CASCADE,
  manufacturer text,
  model text,
  classification text,
  width_ft numeric,
  height_ft numeric,
  supplier_unit_cost numeric NOT NULL,
  adjusted_cost numeric NOT NULL,
  target_material_price numeric NOT NULL,
  quoted_average numeric,
  sold_average numeric,
  quote_sample_size integer NOT NULL DEFAULT 0,
  sold_sample_size integer NOT NULL DEFAULT 0,
  pricing_status text NOT NULL DEFAULT 'low_confidence',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE eb_price_benchmarks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON eb_price_benchmarks TO authenticated;

DROP POLICY IF EXISTS "select_benchmarks" ON eb_price_benchmarks;
CREATE POLICY "select_benchmarks" ON eb_price_benchmarks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

DROP POLICY IF EXISTS "insert_benchmarks_owner" ON eb_price_benchmarks;
CREATE POLICY "insert_benchmarks_owner" ON eb_price_benchmarks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

DROP POLICY IF EXISTS "update_benchmarks_owner" ON eb_price_benchmarks;
CREATE POLICY "update_benchmarks_owner" ON eb_price_benchmarks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

DROP POLICY IF EXISTS "delete_benchmarks_owner" ON eb_price_benchmarks;
CREATE POLICY "delete_benchmarks_owner" ON eb_price_benchmarks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_members m WHERE m.user_id = auth.uid() AND m.role = 'owner')
  );

-- ─── eb_estimates ───
CREATE TABLE IF NOT EXISTS eb_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  job_reference text,
  customer_name text,
  customer_phone text,
  customer_email text,
  service_address text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','sold','dismissed','approved','archived')),
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '{}',
  owner_override_price numeric,
  owner_override_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE eb_estimates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON eb_estimates TO authenticated;

DROP POLICY IF EXISTS "select_own_estimates" ON eb_estimates;
CREATE POLICY "select_own_estimates" ON eb_estimates FOR SELECT
  TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "insert_own_estimates" ON eb_estimates;
CREATE POLICY "insert_own_estimates" ON eb_estimates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_estimates" ON eb_estimates;
CREATE POLICY "update_own_estimates" ON eb_estimates FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "delete_own_estimates" ON eb_estimates;
CREATE POLICY "delete_own_estimates" ON eb_estimates FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ─── eb_estimate_lines ───
CREATE TABLE IF NOT EXISTS eb_estimate_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES eb_estimates(id) ON DELETE CASCADE,
  line_type text NOT NULL CHECK (line_type IN ('door','opener','labor','disposal','accessory','tax')),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT false
);
ALTER TABLE eb_estimate_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON eb_estimate_lines TO authenticated;

DROP POLICY IF EXISTS "select_own_estimate_lines" ON eb_estimate_lines;
CREATE POLICY "select_own_estimate_lines" ON eb_estimate_lines FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_estimate_lines.estimate_id AND e.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_estimate_lines" ON eb_estimate_lines;
CREATE POLICY "insert_own_estimate_lines" ON eb_estimate_lines FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_estimate_lines.estimate_id AND e.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_estimate_lines" ON eb_estimate_lines;
CREATE POLICY "update_own_estimate_lines" ON eb_estimate_lines FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_estimate_lines.estimate_id AND e.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_estimate_lines.estimate_id AND e.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_estimate_lines" ON eb_estimate_lines;
CREATE POLICY "delete_own_estimate_lines" ON eb_estimate_lines FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_estimate_lines.estimate_id AND e.created_by = auth.uid())
  );

-- ─── eb_order_checks ───
CREATE TABLE IF NOT EXISTS eb_order_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES eb_estimates(id) ON DELETE CASCADE,
  check_key text NOT NULL,
  description text NOT NULL,
  classification text NOT NULL DEFAULT 'needs_verification' CHECK (classification IN ('included','order_separately','needs_verification','verified')),
  completed boolean NOT NULL DEFAULT false,
  notes text
);
ALTER TABLE eb_order_checks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON eb_order_checks TO authenticated;

DROP POLICY IF EXISTS "select_own_order_checks" ON eb_order_checks;
CREATE POLICY "select_own_order_checks" ON eb_order_checks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_order_checks.estimate_id AND e.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_order_checks" ON eb_order_checks;
CREATE POLICY "insert_own_order_checks" ON eb_order_checks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_order_checks.estimate_id AND e.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_order_checks" ON eb_order_checks;
CREATE POLICY "update_own_order_checks" ON eb_order_checks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_order_checks.estimate_id AND e.created_by = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_order_checks.estimate_id AND e.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_order_checks" ON eb_order_checks;
CREATE POLICY "delete_own_order_checks" ON eb_order_checks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM eb_estimates e WHERE e.id = eb_order_checks.estimate_id AND e.created_by = auth.uid())
  );

-- ─── eb_sales_prices view ───
CREATE OR REPLACE VIEW eb_sales_prices AS
SELECT
  c.id AS catalog_id,
  c.category,
  c.manufacturer,
  c.model,
  c.design,
  c.color,
  c.width_ft,
  c.height_ft,
  c.panel_type,
  c.window_option,
  c.spring_system,
  c.lift_type,
  c.rail_length,
  c.classification,
  c.supplier_ordering_notes AS notes,
  COALESCE(sp.cost * 1.1 * 2.2, 0) AS standard_price,
  COALESCE(sp.cost * 1.1 * 2.0, 0) AS minimum_price,
  sp.price_date::text AS price_date
FROM eb_catalog c
LEFT JOIN eb_supplier_prices sp ON sp.catalog_id = c.id
WHERE c.active = true;

ALTER VIEW eb_sales_prices SET (security_invoker = true);
GRANT SELECT ON eb_sales_prices TO authenticated;

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON eb_estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimate_lines_estimate_id ON eb_estimate_lines(estimate_id);
CREATE INDEX IF NOT EXISTS idx_order_checks_estimate_id ON eb_order_checks(estimate_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_catalog_id ON eb_supplier_prices(catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_manufacturer_model ON eb_catalog(manufacturer, model);
