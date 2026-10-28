/*
# Seed catalog, supplier prices, and price benchmarks

Inserts the initial product catalog (5 items: 3 doors + 2 openers),
3 supplier price records, and 3 price benchmark records.

The catalog uses fixed UUIDs so supplier prices can reference them.
*/

-- ─── Catalog ───
INSERT INTO eb_catalog (id, category, manufacturer, model, sku, classification, width_ft, height_ft, design, panel_type, color, insulation_type, r_value, steel_thickness, track_size, track_radius, lift_type, spring_system, spring_cycles, door_weight, window_option, included_hardware, optional_accessories, drive_type, horsepower, rail_length, battery_backup, wifi_compatible, has_camera, included_remotes, includes_keypad, includes_safety_sensors, warranty, supplier_ordering_notes, active)
VALUES
('a0000001-0000-0000-0000-000000000001', 'door', 'Amarr', 'Lincoln LI3000', 'AMR-LI3000', 'residential', 8, 7, 'traditional_raised_panel', 'short_panel', 'White', 'polyurethane', '12.76', '24 ga', '2 in', '12 in', 'standard_lift', 'torsion', '15000', '120 lbs', NULL, ARRAY['tracks','torsion shaft','drums','cables','hinges','rollers'], ARRAY['windows','decorative handles'], NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3-year', 'Standard residential. Confirm color availability.', true),
('a0000002-0000-0000-0000-000000000002', 'door', 'C.H.I.', '3282', 'CHI-3282', 'residential', 10, 12, 'carriage_house', 'long_panel', 'Sandstone', 'polystyrene', '6.5', '24 ga', '2 in', '15 in', 'standard_lift', 'torsion', '15000', '185 lbs', 'Standard windows available', ARRAY['tracks','torsion shaft','drums','cables','hinges','rollers'], ARRAY['windows','struts'], NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '5-year', 'Oversized door. Verify track and spring requirements.', true),
('a0000003-0000-0000-0000-000000000003', 'door', 'Haas', 'Americana 2500', 'HAA-AM2500', 'residential', 16, 7, 'traditional_raised_panel', 'short_panel', 'Almond', 'polystyrene', '6.3', '25 ga', '2 in', '12 in', 'standard_lift', 'torsion', '10000', '150 lbs', NULL, ARRAY['tracks','torsion shaft','drums','cables','hinges','rollers'], ARRAY['windows'], NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '3-year', 'Double-wide. Confirm spring configuration for weight.', true),
('a0000004-0000-0000-0000-000000000004', 'opener', 'LiftMaster', 'LM 2220L', 'LMR-2220L', 'residential', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'chain', '1/2 HP', '8 ft', false, true, false, 1, false, true, '5-year motor', 'Confirm rail length matches door height.', true),
('a0000005-0000-0000-0000-000000000005', 'opener', 'LiftMaster', '8500W', 'LMR-8500W', 'residential', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ARRAY['battery backup 485LM','myQ accessories'], 'wall_mount', '1.25 HP', 'N/A (wall mount)', false, true, false, 1, true, true, 'Lifetime motor, 5-year parts', 'Wall-mount. Verify torsion shaft clearance.', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Supplier Prices ───
INSERT INTO eb_supplier_prices (id, catalog_id, supplier, description, size_width, size_height, cost, price_date, source_reference, verified)
VALUES
('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Amarr Direct', 'Amarr Lincoln LI3000 8x7 White', 8, 7, 689.74, '2025-09-15', 'INV-2025-0451', true),
('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'C.H.I. Distributor', 'C.H.I. 3282 10x12 Sandstone', 10, 12, 1750.00, '2025-09-20', 'INV-2025-0389', true),
('b0000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'LiftMaster Distributor', 'LiftMaster LM 2220L chain drive', NULL, NULL, 286.00, '2025-10-01', 'INV-2025-0512', true)
ON CONFLICT (id) DO NOTHING;

-- ─── Price Benchmarks ───
INSERT INTO eb_price_benchmarks (id, supplier_price_id, manufacturer, model, classification, width_ft, height_ft, supplier_unit_cost, adjusted_cost, target_material_price, quoted_average, sold_average, quote_sample_size, sold_sample_size, pricing_status)
VALUES
('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Amarr', 'Lincoln LI3000', 'residential', 8, 7, 689.74, 758.71, 1669.17, NULL, NULL, 1, 0, 'verified'),
('c0000002-0000-0000-0000-000000000002', 'b0000002-0000-0000-0000-000000000002', 'C.H.I.', '3282', 'residential', 10, 12, 1750.00, 1925.00, 4235.00, NULL, NULL, 1, 0, 'low_confidence'),
('c0000003-0000-0000-0000-000000000003', 'b0000003-0000-0000-0000-000000000003', 'LiftMaster', 'LM 2220L', 'residential', NULL, NULL, 286.00, 314.60, 692.12, NULL, NULL, 1, 0, 'verified')
ON CONFLICT (id) DO NOTHING;
