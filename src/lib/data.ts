import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  CatalogItem,
  SupplierPrice,
  SalesPrice,
  PriceBenchmark,
  Estimate,
  EstimateLine,
  OrderCheck,
  Member,
  EstimateOptions,
  EstimateStatus,
  UserRole,
} from "@/types";
import {
  mockCatalog,
  mockSupplierPrices,
  mockBenchmarks,
  mockEstimates,
  mockOrderChecks,
  mockMembers,
  defaultOrderCheckTemplates,
} from "./mockData";
import { calculatePricing, buildEstimateLines } from "./pricing";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const dbStatus = {
  connected: isSupabaseConfigured,
  usingMock: !isSupabaseConfigured,
};

// ─── Catalog ───

export async function fetchCatalog(): Promise<CatalogItem[]> {
  if (!supabase) {
    await delay(200);
    return mockCatalog;
  }
  const { data, error } = await supabase
    .from("eb_catalog")
    .select("*")
    .eq("active", true)
    .order("manufacturer");
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}

// ─── Approved selling prices (no supplier cost; requires eb_sales_prices view) ───
export async function fetchSalesPrices(): Promise<SalesPrice[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("eb_sales_prices").select("*");
  if (error) throw error;
  return (data ?? []) as SalesPrice[];
}

// ─── Supplier Prices (Owner only) ───

export async function fetchSupplierPrices(): Promise<SupplierPrice[]> {
  if (!supabase) {
    await delay(200);
    return mockSupplierPrices;
  }
  const { data, error } = await supabase
    .from("eb_supplier_prices")
    .select("*")
    .order("price_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupplierPrice[];
}

// ─── Price Benchmarks (Owner only) ───

export async function fetchBenchmarks(): Promise<PriceBenchmark[]> {
  if (!supabase) {
    await delay(200);
    return mockBenchmarks;
  }
  const { data, error } = await supabase
    .from("eb_price_benchmarks")
    .select("*")
    .order("manufacturer");
  if (error) throw error;
  return (data ?? []) as PriceBenchmark[];
}

// ─── Estimates ───

export async function fetchEstimates(): Promise<Estimate[]> {
  if (!supabase) {
    await delay(300);
    return mockEstimates;
  }
  const { data, error } = await supabase
    .from("eb_estimates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Estimate[];
}

export async function fetchEstimate(id: string): Promise<Estimate | null> {
  if (!supabase) {
    await delay(200);
    const est = mockEstimates.find((e) => e.id === id);
    if (!est) return null;
    return { ...est, lines: [] };
  }
  const { data: est, error } = await supabase
    .from("eb_estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!est) return null;
  const { data: lines } = await supabase
    .from("eb_estimate_lines")
    .select("*")
    .eq("estimate_id", id);
  return { ...est, lines: (lines ?? []) as EstimateLine[] } as Estimate;
}

export async function saveEstimate(
  userId: string,
  jobRef: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  serviceAddress: string,
  options: EstimateOptions,
  status: EstimateStatus
): Promise<Estimate> {
  const breakdown = calculatePricing(options);
  const lines = buildEstimateLines(options, breakdown);

  if (!supabase) {
    await delay(300);
    const id = `est-${Date.now()}`;
    const newEst: Estimate = {
      id,
      created_by: userId,
      job_reference: jobRef,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      service_address: serviceAddress,
      status,
      subtotal: breakdown.subtotal,
      tax: breakdown.tax,
      total: breakdown.total,
      options,
      owner_override_price: null,
      owner_override_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lines,
    };
    mockEstimates.unshift(newEst);
    return newEst;
  }

  const { data, error } = await supabase
    .from("eb_estimates")
    .insert({
      created_by: userId,
      job_reference: jobRef,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      service_address: serviceAddress,
      status,
      subtotal: breakdown.subtotal,
      tax: breakdown.tax,
      total: breakdown.total,
      options,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (lines.length > 0) {
    const { error: lineError } = await supabase
      .from("eb_estimate_lines")
      .insert(lines.map(({ id: _temporaryId, ...line }) => ({ ...line, estimate_id: data.id })));
    if (lineError) throw lineError;
  }

  return fetchEstimate(data.id) as Promise<Estimate>;
}

export async function updateEstimateStatus(
  id: string,
  status: EstimateStatus
): Promise<void> {
  if (!supabase) {
    await delay(150);
    const est = mockEstimates.find((e) => e.id === id);
    if (est) {
      est.status = status;
      est.updated_at = new Date().toISOString();
    }
    return;
  }
  const { error } = await supabase
    .from("eb_estimates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function ownerOverridePrice(
  id: string,
  price: number,
  reason: string
): Promise<void> {
  if (!supabase) {
    await delay(150);
    const est = mockEstimates.find((e) => e.id === id);
    if (est) {
      est.owner_override_price = price;
      est.owner_override_reason = reason;
      est.updated_at = new Date().toISOString();
    }
    return;
  }
  const { error } = await supabase
    .from("eb_estimates")
    .update({
      owner_override_price: price,
      owner_override_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

// ─── Order Checks ───

export async function fetchOrderChecks(estimateId: string): Promise<OrderCheck[]> {
  if (!supabase) {
    await delay(200);
    return mockOrderChecks.filter((c) => c.estimate_id === estimateId);
  }
  const { data, error } = await supabase
    .from("eb_order_checks")
    .select("*")
    .eq("estimate_id", estimateId);
  if (error) throw error;
  return (data ?? []) as OrderCheck[];
}

export async function createOrderChecksForEstimate(estimateId: string): Promise<OrderCheck[]> {
  const checks = defaultOrderCheckTemplates.map((c) => ({ ...c, estimate_id: estimateId }));
  if (!supabase) {
    await delay(150);
    const withIds = checks.map((c, i) => ({ ...c, id: `oc-${estimateId}-${i}` }));
    mockOrderChecks.push(...withIds);
    return withIds;
  }
  const { data, error } = await supabase
    .from("eb_order_checks")
    .insert(checks)
    .select("*");
  if (error) throw error;
  return (data ?? []) as OrderCheck[];
}

export async function updateOrderCheck(
  id: string,
  updates: Partial<Pick<OrderCheck, "classification" | "completed" | "notes">>
): Promise<void> {
  if (!supabase) {
    await delay(100);
    const check = mockOrderChecks.find((c) => c.id === id);
    if (check) Object.assign(check, updates);
    return;
  }
  const { error } = await supabase
    .from("eb_order_checks")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

// ─── Members ───

export async function fetchMembers(): Promise<Member[]> {
  if (!supabase) {
    await delay(200);
    return mockMembers;
  }
  const { data, error } = await supabase
    .from("eb_members")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function fetchMember(userId: string): Promise<Member | null> {
  if (!supabase) {
    await delay(100);
    return mockMembers.find((m) => m.user_id === userId) ?? null;
  }
  const { data, error } = await supabase
    .from("eb_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Member | null;
}

export async function updateMemberRole(userId: string, role: UserRole): Promise<void> {
  if (!supabase) {
    await delay(100);
    const m = mockMembers.find((m) => m.user_id === userId);
    if (m) m.role = role;
    return;
  }
  const { error } = await supabase
    .from("eb_members")
    .update({ role })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function toggleMemberActive(userId: string, active: boolean): Promise<void> {
  if (!supabase) {
    await delay(100);
    const m = mockMembers.find((m) => m.user_id === userId);
    if (m) m.active = active;
    return;
  }
  const { error } = await supabase
    .from("eb_members")
    .update({ active })
    .eq("user_id", userId);
  if (error) throw error;
}
