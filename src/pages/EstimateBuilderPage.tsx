import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Plus, Trash2, Copy, Save, ArrowLeft, CircleCheck as CheckCircle2, Package, DollarSign, FileDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchEstimate, saveEstimate, fetchOrderChecks, createOrderChecksForEstimate, updateOrderCheck, ownerOverridePrice } from "@/lib/data";
import {
  TAX_RATE_DEFAULT,
  MIN_LABOR,
  MAX_LABOR,
  clampLabor,
  clampDiscount,
  calculatePricing,
  recalcDoorSelling,
  recalcOpenerSelling,
  formatCurrency,
  type PricingBreakdown,
} from "@/lib/pricing";
import type { EstimateDoorConfig, EstimateOpenerConfig, EstimateOptions, EstimateStatus, OrderCheck } from "@/types";

const doorDesigns = [
  { value: "traditional_raised_panel", label: "Traditional Raised Panel" },
  { value: "flush_modern", label: "Flush / Modern" },
  { value: "carriage_house", label: "Carriage House" },
  { value: "full_view_glass", label: "Full View Glass" },
  { value: "custom", label: "Custom" },
];

const insulationTypes = [
  { value: "non_insulated", label: "Non-insulated" },
  { value: "polystyrene", label: "Polystyrene" },
  { value: "polyurethane", label: "Polyurethane" },
  { value: "other", label: "Other" },
];

const manufacturers = ["Amarr", "C.H.I.", "Haas", "Other / Custom"];
const openerBrands = ["LiftMaster", "Other"];

function emptyDoor(): EstimateDoorConfig {
  return {
    manufacturer: "Amarr",
    model: "",
    sku: null,
    width_ft: 9,
    height_ft: 7,
    color: "",
    design: "traditional_raised_panel",
    panel_type: null,
    insulation_type: "non_insulated",
    window_option: null,
    quantity: 1,
    custom: false,
    supplier_cost: null,
    selling_price: 0,
    discount_percent: 0,
  };
}

function emptyOpener(): EstimateOpenerConfig {
  return {
    brand: "LiftMaster",
    model: "",
    quantity: 1,
    supplier_cost: null,
    selling_price: 0,
    discount_percent: 0,
  };
}

const defaultOptions: EstimateOptions = {
  doors: [emptyDoor()],
  openers: [],
  labor_per_door: 650,
  disposal_enabled: true,
  door_count_for_disposal: 1,
  old_opener_disposal_count: 0,
  material_discount_percent: 0,
  tax_rate: TAX_RATE_DEFAULT,
  tax_enabled: true,
  notes: "",
  custom: false,
};

export function EstimateBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isOwner = session?.role === "owner";

  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [options, setOptions] = useState<EstimateOptions>(defaultOptions);
  const [jobRef, setJobRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [status, setStatus] = useState<EstimateStatus>("draft");
  const [orderChecks, setOrderChecks] = useState<OrderCheck[]>([]);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const est = await fetchEstimate(id);
        if (cancelled || !est) return;
        setOptions(est.options ?? defaultOptions);
        setJobRef(est.job_reference ?? "");
        setCustomerName(est.customer_name ?? "");
        setCustomerPhone(est.customer_phone ?? "");
        setCustomerEmail(est.customer_email ?? "");
        setServiceAddress(est.service_address ?? "");
        setStatus(est.status);
        const checks = await fetchOrderChecks(id);
        if (!cancelled) setOrderChecks(checks);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load estimate.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const breakdown: PricingBreakdown = useMemo(() => calculatePricing(options), [options]);

  const updateDoor = useCallback((index: number, updates: Partial<EstimateDoorConfig>) => {
    setOptions((prev) => {
      const doors = [...prev.doors];
      doors[index] = { ...doors[index], ...updates };
      if (updates.supplier_cost !== undefined || updates.discount_percent !== undefined) {
        doors[index].selling_price = recalcDoorSelling({
          supplier_cost: doors[index].supplier_cost,
          discount_percent: doors[index].discount_percent,
        });
      }
      return { ...prev, doors };
    });
  }, []);

  const addDoor = () => {
    setOptions((prev) => ({ ...prev, doors: [...prev.doors, emptyDoor()] }));
  };

  const removeDoor = (index: number) => {
    setOptions((prev) => ({ ...prev, doors: prev.doors.filter((_, i) => i !== index) }));
  };

  const duplicateDoor = (index: number) => {
    setOptions((prev) => {
      const doors = [...prev.doors];
      doors.splice(index + 1, 0, { ...doors[index] });
      return { ...prev, doors };
    });
  };

  const updateOpener = useCallback((index: number, updates: Partial<EstimateOpenerConfig>) => {
    setOptions((prev) => {
      const openers = [...prev.openers];
      openers[index] = { ...openers[index], ...updates };
      if (updates.supplier_cost !== undefined || updates.discount_percent !== undefined) {
        openers[index].selling_price = recalcOpenerSelling({
          supplier_cost: openers[index].supplier_cost,
          discount_percent: openers[index].discount_percent,
        });
      }
      return { ...prev, openers };
    });
  }, []);

  const addOpener = () => {
    setOptions((prev) => ({ ...prev, openers: [...prev.openers, emptyOpener()] }));
  };

  const removeOpener = (index: number) => {
    setOptions((prev) => ({ ...prev, openers: prev.openers.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!session) return;
    setError(null);
    setSaveMsg(null);
    const hasDoor = options.doors.some((d) => d.model.trim());
    if (!hasDoor) {
      setError("Enter at least one door with a model name.");
      return;
    }
    try {
      const saved = await saveEstimate(
        session.user_id,
        jobRef,
        customerName,
        customerPhone,
        customerEmail,
        serviceAddress,
        options,
        status
      );
      setSaveMsg("Estimate saved successfully.");
      if (!id) navigate(`/estimates/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save estimate.");
    }
  };

  const handleCopyServiceTitan = () => {
    const lines: string[] = [];
    lines.push("TRIPLE A GARAGE DOORS — ESTIMATE");
    lines.push(`Reference: ${jobRef || "(not set)"}`);
    lines.push(`Customer: ${customerName || "(not set)"}`);
    if (customerPhone) lines.push(`Phone: ${customerPhone}`);
    if (serviceAddress) lines.push(`Address: ${serviceAddress}`);
    lines.push("");
    for (const d of options.doors) {
      if (!d.model.trim()) continue;
      lines.push(`Door: ${d.manufacturer} ${d.model} ${d.width_ft}x${d.height_ft} ${d.color}`.trim());
      lines.push(`  Qty: ${d.quantity}, Price: ${formatCurrency(d.selling_price)}/door`);
    }
    for (const o of options.openers) {
      if (!o.model.trim()) continue;
      lines.push(`Opener: ${o.brand} ${o.model}, Qty: ${o.quantity}, Price: ${formatCurrency(o.selling_price)}`);
    }
    lines.push("");
    lines.push(`Labor: ${formatCurrency(breakdown.laborTotal)}`);
    if (breakdown.doorDisposalTotal > 0) lines.push(`Door Disposal: ${formatCurrency(breakdown.doorDisposalTotal)}`);
    if (breakdown.openerDisposalTotal > 0) lines.push(`Opener Disposal: ${formatCurrency(breakdown.openerDisposalTotal)}`);
    lines.push(`Subtotal: ${formatCurrency(breakdown.subtotal)}`);
    if (breakdown.tax > 0) lines.push(`Tax: ${formatCurrency(breakdown.tax)}`);
    lines.push(`Total: ${formatCurrency(breakdown.total)}`);
    if (options.notes) {
      lines.push("");
      lines.push(`Scope: ${options.notes}`);
    }
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(
      () => setSaveMsg("Customer-facing estimate copied to clipboard."),
      () => setError("Copy unavailable in this browser.")
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateChecks = async () => {
    if (!id) {
      setOrderChecks([]);
      return;
    }
    try {
      const checks = await createOrderChecksForEstimate(id);
      setOrderChecks(checks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order checks.");
    }
  };

  const handleCheckUpdate = async (checkId: string, updates: Partial<OrderCheck>) => {
    setOrderChecks((prev) => prev.map((c) => (c.id === checkId ? { ...c, ...updates } : c)));
    try {
      await updateOrderCheck(checkId, updates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update check.");
    }
  };

  const handleOverride = async () => {
    if (!id) return;
    const price = Number(overridePrice);
    if (isNaN(price) || price < 0) {
      setError("Enter a valid override price.");
      return;
    }
    if (!overrideReason.trim()) {
      setError("A reason is required for price override.");
      return;
    }
    try {
      await ownerOverridePrice(id, price, overrideReason);
      setOverrideOpen(false);
      setSaveMsg("Owner override applied.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply override.");
    }
  };

  if (loading) {
    return <div className="loading-center"><div className="spinner" /> Loading estimate...</div>;
  }

  const allCriticalVerified = orderChecks.length > 0 && orderChecks.every((c) =>
    c.classification !== "needs_verification" || c.completed
  );

  return (
    <div className="fade-in">
      {error && <div className="alert alert-error">{error}</div>}
      {saveMsg && <div className="alert alert-success"><CheckCircle2 size={16} /> {saveMsg}</div>}

      <Link to="/estimates" className="btn btn-ghost btn-sm mb-4">
        <ArrowLeft size={16} /> Back to Estimates
      </Link>

      <div className="form-grid" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>
        {/* Left column: Configuration */}
        <div className="flex-col gap-4">
          {/* Customer info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Customer & Job Info</div>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>Job Reference</label>
                <input value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="JOB-2025-001" />
              </div>
              <div className="form-field">
                <label>Customer Name</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="555-1234" />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="form-field full">
                <label>Service Address</label>
                <input value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} placeholder="123 Main St, Springfield, MA" />
              </div>
            </div>
          </div>

          {/* Doors */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Doors</div>
              <button className="btn btn-outline btn-sm" onClick={addDoor}>
                <Plus size={16} /> Add Door
              </button>
            </div>
            {options.doors.map((door, i) => (
              <div key={i} className="door-config" style={{ borderBottom: i < options.doors.length - 1 ? "1px solid var(--neutral-200)" : "none", paddingBottom: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div className="flex justify-between items-center mb-2">
                  <h4>Door {i + 1}</h4>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => duplicateDoor(i)} title="Duplicate">
                      <Copy size={14} />
                    </button>
                    {options.doors.length > 1 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => removeDoor(i)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Manufacturer</label>
                    <select value={door.manufacturer} onChange={(e) => updateDoor(i, { manufacturer: e.target.value })}>
                      {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Model</label>
                    <input value={door.model} onChange={(e) => updateDoor(i, { model: e.target.value })} placeholder="Exact model" />
                  </div>
                  <div className="form-field">
                    <label>Width (ft)</label>
                    <input type="number" min={1} value={door.width_ft} onChange={(e) => updateDoor(i, { width_ft: Number(e.target.value) })} />
                  </div>
                  <div className="form-field">
                    <label>Height (ft)</label>
                    <input type="number" min={1} value={door.height_ft} onChange={(e) => updateDoor(i, { height_ft: Number(e.target.value) })} />
                  </div>
                  <div className="form-field">
                    <label>Color / Finish</label>
                    <input value={door.color} onChange={(e) => updateDoor(i, { color: e.target.value })} placeholder="Manufacturer finish" />
                  </div>
                  <div className="form-field">
                    <label>Design</label>
                    <select value={door.design} onChange={(e) => updateDoor(i, { design: e.target.value as EstimateDoorConfig["design"] })}>
                      {doorDesigns.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Insulation</label>
                    <select value={door.insulation_type ?? "non_insulated"} onChange={(e) => updateDoor(i, { insulation_type: e.target.value as EstimateDoorConfig["insulation_type"] })}>
                      {insulationTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Quantity</label>
                    <input type="number" min={1} value={door.quantity} onChange={(e) => updateDoor(i, { quantity: Math.max(1, Number(e.target.value)) })} />
                  </div>
                  {isOwner && (
                    <div className="form-field">
                      <label>Supplier Door Cost ($)</label>
                      <input
                        type="number"
                        min={0}
                        value={door.supplier_cost ?? ""}
                        onChange={(e) => updateDoor(i, { supplier_cost: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Owner only"
                      />
                    </div>
                  )}
                  <div className="form-field">
                    <label>Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={door.discount_percent}
                      onChange={(e) => updateDoor(i, { discount_percent: clampDiscount(Number(e.target.value) / 100) * 100 })}
                    />
                  </div>
                  {!isOwner && (
                    <div className="form-field">
                      <label>Selling Price ($/door)</label>
                      <input
                        type="number"
                        min={0}
                        value={door.selling_price || ""}
                        onChange={(e) => updateDoor(i, { selling_price: Number(e.target.value) })}
                        placeholder="Selling price"
                      />
                    </div>
                  )}
                  {isOwner && door.selling_price > 0 && (
                    <div className="form-field full">
                      <label>Selling Price (auto-calculated)</label>
                      <div className="money money-lg" style={{ fontSize: "1.25rem" }}>{formatCurrency(door.selling_price)} / door</div>
                    </div>
                  )}
                </div>
                <div className="check-row mt-2">
                  <input
                    type="checkbox"
                    checked={door.custom}
                    onChange={(e) => updateDoor(i, { custom: e.target.checked })}
                  />
                  <span>Custom order — supplier confirmation required</span>
                </div>
              </div>
            ))}
          </div>

          {/* Openers */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Openers</div>
              <button className="btn btn-outline btn-sm" onClick={addOpener}>
                <Plus size={16} /> Add Opener
              </button>
            </div>
            {options.openers.length === 0 ? (
              <p className="text-muted">No openers added. Click "Add Opener" to include one.</p>
            ) : (
              options.openers.map((opener, i) => (
                <div key={i} style={{ borderBottom: i < options.openers.length - 1 ? "1px solid var(--neutral-200)" : "none", paddingBottom: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                  <div className="flex justify-between items-center mb-2">
                    <h4>Opener {i + 1}</h4>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeOpener(i)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Brand</label>
                      <select value={opener.brand} onChange={(e) => updateOpener(i, { brand: e.target.value })}>
                        {openerBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Model</label>
                      <input value={opener.model} onChange={(e) => updateOpener(i, { model: e.target.value })} placeholder="Opener model" />
                    </div>
                    <div className="form-field">
                      <label>Quantity</label>
                      <input type="number" min={1} value={opener.quantity} onChange={(e) => updateOpener(i, { quantity: Math.max(1, Number(e.target.value)) })} />
                    </div>
                    {isOwner ? (
                      <div className="form-field">
                        <label>Supplier Cost ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={opener.supplier_cost ?? ""}
                          onChange={(e) => updateOpener(i, { supplier_cost: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Owner only"
                        />
                      </div>
                    ) : (
                      <div className="form-field">
                        <label>Selling Price ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={opener.selling_price || ""}
                          onChange={(e) => updateOpener(i, { selling_price: Number(e.target.value) })}
                          placeholder="Selling price"
                        />
                      </div>
                    )}
                    <div className="form-field">
                      <label>Discount (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={opener.discount_percent}
                        onChange={(e) => updateOpener(i, { discount_percent: clampDiscount(Number(e.target.value) / 100) * 100 })}
                      />
                    </div>
                    {isOwner && opener.selling_price > 0 && (
                      <div className="form-field full">
                        <label>Selling Price (auto-calculated)</label>
                        <div className="money" style={{ fontSize: "1.125rem", color: "var(--success-600)" }}>{formatCurrency(opener.selling_price)} / opener</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Labor, Disposal, Tax */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Labor, Disposal & Tax</div>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>Labor Per Door (${MIN_LABOR}–${MAX_LABOR})</label>
                <input
                  type="number"
                  min={MIN_LABOR}
                  max={MAX_LABOR}
                  value={options.labor_per_door}
                  onChange={(e) => setOptions((prev) => ({ ...prev, labor_per_door: clampLabor(Number(e.target.value)) }))}
                />
              </div>
              <div className="form-field">
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={(options.tax_rate * 100).toFixed(2)}
                  onChange={(e) => setOptions((prev) => ({ ...prev, tax_rate: Number(e.target.value) / 100 }))}
                />
              </div>
              <div className="form-field">
                <label>Old Openers to Dispose</label>
                <input
                  type="number"
                  min={0}
                  value={options.old_opener_disposal_count}
                  onChange={(e) => setOptions((prev) => ({ ...prev, old_opener_disposal_count: Math.max(0, Number(e.target.value)) }))}
                />
              </div>
              <div className="form-field">
                <label>Door Count for Disposal</label>
                <input
                  type="number"
                  min={0}
                  value={options.door_count_for_disposal}
                  onChange={(e) => setOptions((prev) => ({ ...prev, door_count_for_disposal: Math.max(0, Number(e.target.value)) }))}
                />
              </div>
            </div>
            <div className="check-row mt-2">
              <input
                type="checkbox"
                checked={options.disposal_enabled}
                onChange={(e) => setOptions((prev) => ({ ...prev, disposal_enabled: e.target.checked }))}
              />
              <span>Remove and dispose of existing doors</span>
            </div>
            <div className="check-row">
              <input
                type="checkbox"
                checked={options.tax_enabled}
                onChange={(e) => setOptions((prev) => ({ ...prev, tax_enabled: e.target.checked }))}
              />
              <span>Apply sales tax to materials (doors & openers)</span>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Installation Scope / Notes</div>
            </div>
            <textarea
              value={options.notes}
              onChange={(e) => setOptions((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Job conditions, framing, track configuration, electrical requirements..."
              style={{ minHeight: 100 }}
            />
          </div>

          {/* Supplier Ordering Checklist */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Package size={18} />
                Supplier Ordering Guide
              </div>
              {id && orderChecks.length === 0 && (
                <button className="btn btn-outline btn-sm" onClick={handleGenerateChecks}>
                  Generate Checklist
                </button>
              )}
            </div>
            {orderChecks.length > 0 ? (
              <>
                {orderChecks.map((check) => (
                  <div key={check.id} className="check-row" style={{ borderTop: "1px solid var(--neutral-100)", paddingTop: "var(--space-3)" }}>
                    <input
                      type="checkbox"
                      checked={check.completed}
                      onChange={(e) => handleCheckUpdate(check.id, { completed: e.target.checked })}
                    />
                    <div className="flex-col w-full">
                      <span style={{ textDecoration: check.completed ? "line-through" : "none", color: check.completed ? "var(--neutral-400)" : "inherit" }}>
                        {check.description}
                      </span>
                      <div className="flex gap-2 mt-2 items-center">
                        <select
                          value={check.classification}
                          onChange={(e) => handleCheckUpdate(check.id, { classification: e.target.value as OrderCheck["classification"] })}
                          style={{ fontSize: "0.75rem", padding: "3px 24px 3px 8px", width: "auto" }}
                        >
                          <option value="included">Included</option>
                          <option value="order_separately">Order Separately</option>
                          <option value="needs_verification">Needs Verification</option>
                          <option value="verified">Verified</option>
                        </select>
                        {check.classification === "needs_verification" && !check.completed && (
                          <span className="badge badge-dismissed">Required</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4" style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: allCriticalVerified ? "var(--success-50)" : "var(--warning-50)" }}>
                  <p style={{ color: allCriticalVerified ? "var(--success-600)" : "var(--warning-600)", fontWeight: 600, fontSize: "0.8125rem" }}>
                    {allCriticalVerified ? "All critical checks verified — ready to order." : "Complete all needs-verification checks before marking ready to order."}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted">
                {id ? "Click 'Generate Checklist' to create the supplier ordering verification." : "Save the estimate first to generate the ordering checklist."}
              </p>
            )}
          </div>
        </div>

        {/* Right column: Summary */}
        <div className="flex-col gap-4" style={{ position: "sticky", top: 88 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Estimate Summary</div>
            </div>

            <div className="estimate-line">
              <span>Doors</span>
              <strong className="money">{formatCurrency(breakdown.doorsTotal)}</strong>
            </div>
            {breakdown.openersTotal > 0 && (
              <div className="estimate-line">
                <span>Openers</span>
                <strong className="money">{formatCurrency(breakdown.openersTotal)}</strong>
              </div>
            )}
            <div className="estimate-line">
              <span>Installation Labor</span>
              <strong className="money">{formatCurrency(breakdown.laborTotal)}</strong>
            </div>
            {breakdown.doorDisposalTotal > 0 && (
              <div className="estimate-line">
                <span>Door Disposal</span>
                <strong className="money">{formatCurrency(breakdown.doorDisposalTotal)}</strong>
              </div>
            )}
            {breakdown.openerDisposalTotal > 0 && (
              <div className="estimate-line">
                <span>Opener Disposal</span>
                <strong className="money">{formatCurrency(breakdown.openerDisposalTotal)}</strong>
              </div>
            )}
            {breakdown.discountAmount > 0 && (
              <div className="estimate-line" style={{ color: "var(--accent-600)" }}>
                <span>Material Discount Applied</span>
                <strong className="money">-{formatCurrency(breakdown.discountAmount)}</strong>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--neutral-200)", margin: "var(--space-3) 0", paddingTop: "var(--space-3)" }}>
              <div className="estimate-line">
                <span>Subtotal Before Tax</span>
                <strong className="money">{formatCurrency(breakdown.subtotal)}</strong>
              </div>
              {breakdown.tax > 0 && (
                <div className="estimate-line">
                  <span>Tax ({(options.tax_rate * 100).toFixed(2)}%)</span>
                  <strong className="money">{formatCurrency(breakdown.tax)}</strong>
                </div>
              )}
            </div>

            <div style={{ borderTop: "2px solid var(--neutral-300)", paddingTop: "var(--space-3)", marginTop: "var(--space-2)" }}>
              <div className="flex justify-between items-center">
                <strong style={{ fontSize: "1.125rem" }}>Estimated Total</strong>
                <span className="money-lg">{formatCurrency(breakdown.total)}</span>
              </div>
            </div>

            {isOwner && breakdown.grossCost > 0 && (
              <div style={{ marginTop: "var(--space-4)", padding: "var(--space-3)", background: "var(--primary-50)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-600)", textTransform: "uppercase", marginBottom: "var(--space-2)" }}>
                  Owner Only — Margin
                </div>
                <div className="estimate-line">
                  <span>Gross Cost</span>
                  <strong className="money">{formatCurrency(breakdown.grossCost)}</strong>
                </div>
                <div className="estimate-line">
                  <span>Gross Profit</span>
                  <strong className="money" style={{ color: "var(--success-600)" }}>{formatCurrency(breakdown.grossProfit)}</strong>
                </div>
                <div className="estimate-line">
                  <span>Margin</span>
                  <strong className="money">{breakdown.marginPercent.toFixed(1)}%</strong>
                </div>
              </div>
            )}

            {isOwner && (
              <button className="btn btn-outline btn-sm w-full mt-4" onClick={() => setOverrideOpen(!overrideOpen)}>
                <DollarSign size={14} /> Owner Price Override
              </button>
            )}
            {overrideOpen && (
              <div className="mt-2" style={{ padding: "var(--space-3)", background: "var(--neutral-50)", borderRadius: "var(--radius-md)" }}>
                <div className="form-field mb-2">
                  <label>Override Total Price ($)</label>
                  <input type="number" min={0} value={overridePrice} onChange={(e) => setOverridePrice(e.target.value)} placeholder={breakdown.total.toFixed(2)} />
                </div>
                <div className="form-field mb-2">
                  <label>Reason (required)</label>
                  <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Reason for override" />
                </div>
                <button className="btn btn-primary btn-sm w-full" onClick={handleOverride}>Apply Override</button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="card">
            <div className="flex-col gap-2">
              <button className="btn btn-primary w-full" onClick={handleSave}>
                <Save size={16} /> Save Estimate
              </button>
              <button className="btn btn-secondary w-full" onClick={handleCopyServiceTitan}>
                <Copy size={16} /> Copy for ServiceTitan
              </button>
              <button className="btn btn-outline w-full" onClick={handlePrint}>
                <FileDown size={16} /> Print / PDF
              </button>
            </div>
            <p className="text-muted mt-4">
              Customer-facing output contains selling prices only. Supplier costs and margins are never included.
            </p>
          </div>

          {/* Pricing Comparison */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Pricing References</div>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--neutral-600)" }}>
              <div className="estimate-line">
                <span>Supplier-Cost-Based Price</span>
                <strong className="money">{formatCurrency(breakdown.doorsTotal + breakdown.openersTotal)}</strong>
              </div>
              <div className="estimate-line">
                <span>Public Calculator Range</span>
                <span className="text-muted">Indicative only</span>
              </div>
              <div className="estimate-line">
                <span>ServiceTitan Historical</span>
                <span className="text-muted">Pending import</span>
              </div>
            </div>
            <p className="text-muted mt-2" style={{ fontSize: "0.75rem" }}>
              The public calculator's 27% minimum reduction is never applied to internal pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
