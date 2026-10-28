// Database types matching the existing Supabase schema (project dclsuavrlnaclpvkbrck)
// Tables: eb_catalog, eb_supplier_prices, eb_price_benchmarks, eb_estimates,
//         eb_estimate_lines, eb_order_checks, eb_members

export type UserRole = "owner" | "admin" | "sales";

export type EstimateStatus = "draft" | "sent" | "sold" | "dismissed" | "approved" | "archived";

export type ProductCategory = "door" | "opener" | "track" | "spring" | "shaft" | "drum" | "cable" | "roller" | "hinge" | "bracket" | "strut" | "weatherstrip" | "reinforcement" | "opener_accessory";

export type DoorDesign = "traditional_raised_panel" | "flush_modern" | "carriage_house" | "full_view_glass" | "custom";
export type DoorInsulation = "non_insulated" | "polystyrene" | "polyurethane" | "other";
export type PanelType = "short_panel" | "long_panel" | "flush" | "none";
export type LiftType = "standard_lift" | "high_lift" | "low_headroom" | "vertical_lift";
export type SpringSystem = "torsion" | "extension";
export type CommercialResidential = "residential" | "commercial";
export type OpenerDriveType = "belt" | "chain" | "wall_mount" | "commercial";

export interface Member {
  user_id: string;
  role: UserRole;
  email: string;
  full_name: string | null;
  active: boolean;
  created_at: string;
}

export interface CatalogItem {
  id: string;
  category: ProductCategory;
  manufacturer: string;
  model: string;
  sku: string | null;
  classification: CommercialResidential;
  width_ft: number | null;
  height_ft: number | null;
  design: DoorDesign | null;
  panel_type: PanelType | null;
  color: string | null;
  insulation_type: DoorInsulation | null;
  r_value: string | null;
  steel_thickness: string | null;
  track_size: string | null;
  track_radius: string | null;
  lift_type: LiftType | null;
  spring_system: SpringSystem | null;
  spring_cycles: string | null;
  door_weight: string | null;
  window_option: string | null;
  included_hardware: string[] | null;
  optional_accessories: string[] | null;
  drive_type: OpenerDriveType | null;
  horsepower: string | null;
  rail_length: string | null;
  battery_backup: boolean | null;
  wifi_compatible: boolean | null;
  has_camera: boolean | null;
  included_remotes: number | null;
  includes_keypad: boolean | null;
  includes_safety_sensors: boolean | null;
  warranty: string | null;
  supplier_ordering_notes: string | null;
  active: boolean;
  created_at: string;
}

export interface SupplierPrice {
  id: string;
  catalog_item_id: string | null;
  supplier: string;
  manufacturer: string;
  model: string;
  sku: string | null;
  product_config: Record<string, unknown> | null;
  unit_cost: number;
  invoice_date: string;
  invoice_number: string | null;
  source_document: string | null;
  verification_status: "verified" | "unverified" | "pending";
  created_at: string;
}

export interface PriceBenchmark {
  id: string;
  manufacturer: string;
  model: string;
  classification: CommercialResidential | null;
  supplier_unit_cost: number;
  adjusted_supplier_cost: number;
  target_material_price: number;
  historical_avg_price: number | null;
  historical_median_price: number | null;
  quote_sample_size: number;
  confidence: "high" | "medium" | "low";
  created_at: string;
}

export interface EstimateLine {
  id: string;
  estimate_id: string;
  line_type: "door" | "opener" | "labor" | "disposal" | "accessory" | "tax";
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  taxable: boolean;
}

export interface EstimateDoorConfig {
  manufacturer: string;
  model: string;
  sku: string | null;
  width_ft: number;
  height_ft: number;
  color: string;
  design: DoorDesign;
  panel_type: PanelType | null;
  insulation_type: DoorInsulation | null;
  window_option: string | null;
  quantity: number;
  custom: boolean;
  supplier_cost: number | null;
  selling_price: number;
  discount_percent: number;
}

export interface EstimateOpenerConfig {
  brand: string;
  model: string;
  quantity: number;
  supplier_cost: number | null;
  selling_price: number;
  discount_percent: number;
}

export interface EstimateOptions {
  doors: EstimateDoorConfig[];
  openers: EstimateOpenerConfig[];
  labor_per_door: number;
  disposal_enabled: boolean;
  door_count_for_disposal: number;
  old_opener_disposal_count: number;
  material_discount_percent: number;
  tax_rate: number;
  tax_enabled: boolean;
  notes: string;
  custom: boolean;
}

export interface Estimate {
  id: string;
  created_by: string;
  job_reference: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service_address: string | null;
  status: EstimateStatus;
  subtotal: number;
  tax: number;
  total: number;
  options: EstimateOptions;
  owner_override_price: number | null;
  owner_override_reason: string | null;
  created_at: string;
  updated_at: string;
  lines: EstimateLine[];
}

export interface OrderCheck {
  id: string;
  estimate_id: string;
  check_key: string;
  description: string;
  classification: "included" | "order_separately" | "needs_verification" | "verified";
  completed: boolean;
  notes: string | null;
}

export interface AuthSession {
  user_id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
}
