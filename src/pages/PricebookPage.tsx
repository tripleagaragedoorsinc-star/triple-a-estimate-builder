import { useEffect, useState, useMemo } from "react";
import { DollarSign, Search, Upload } from "lucide-react";
import { fetchSupplierPrices, fetchBenchmarks } from "@/lib/data";
import { formatCurrency, COST_ESCALATION, MATERIAL_MARKUP } from "@/lib/pricing";
import type { SupplierPrice, PriceBenchmark } from "@/types";

export function PricebookPage() {
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [benchmarks, setBenchmarks] = useState<PriceBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"prices" | "benchmarks">("prices");

  useEffect(() => {
    (async () => {
      try {
        const [p, b] = await Promise.all([fetchSupplierPrices(), fetchBenchmarks()]);
        setPrices(p);
        setBenchmarks(b);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load pricebook.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredPrices = useMemo(() => {
    const q = search.toLowerCase();
    return prices.filter((p) =>
      p.description.toLowerCase().includes(q) ||
      p.source_reference?.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q)
    );
  }, [prices, search]);

  const filteredBenchmarks = useMemo(() => {
    const q = search.toLowerCase();
    return benchmarks.filter((b) =>
      b.manufacturer.toLowerCase().includes(q) ||
      b.model.toLowerCase().includes(q)
    );
  }, [benchmarks, search]);

  if (loading) return <div className="loading-center"><div className="spinner" /> Loading pricebook...</div>;

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <DollarSign size={20} />
            Owner Pricebook
          </div>
          <button className="btn btn-outline btn-sm" disabled title="CSV import coming soon">
            <Upload size={14} /> Import Supplier Invoice
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="alert alert-warning">
          Supplier costs and margins are visible to Owner only. Never share with sales staff or customers.
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`btn btn-sm ${tab === "prices" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab("prices")}
          >
            Supplier Prices ({prices.length})
          </button>
          <button
            className={`btn btn-sm ${tab === "benchmarks" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab("benchmarks")}
          >
            Price Benchmarks ({benchmarks.length})
          </button>
        </div>

        <div className="form-field mb-4">
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--neutral-400)" }} />
            <input
              type="text"
              placeholder="Search supplier prices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        {tab === "prices" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Size</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>Unit Cost</th>
                  <th>Invoice</th>
                  <th>Invoice Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((p) => (
                  <tr key={p.id}>
                    <td>{p.supplier}</td>
                    <td>{p.description}</td>
                    <td>{p.size_width ?? "—"} × {p.size_height ?? "—"}</td>
                    <td className="font-mono">{p.source_reference || "—"}</td>
                    <td style={{ textAlign: "right" }} className="money">{formatCurrency(p.cost)}</td>
                    <td>{p.source_reference || "—"}</td>
                    <td className="text-muted">{p.price_date ? new Date(p.price_date).toLocaleDateString() : "—"}</td>
                    <td>
                      <span className={`badge ${p.verified ? "badge-approved" : !p.verified ? "badge-sent" : "badge-dismissed"}`}>
                        {p.verified ? "verified" : "unverified"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Classification</th>
                  <th style={{ textAlign: "right" }}>Supplier Cost</th>
                  <th style={{ textAlign: "right" }}>Adjusted Cost (x{COST_ESCALATION})</th>
                  <th style={{ textAlign: "right" }}>Target Price (x{MATERIAL_MARKUP})</th>
                  <th style={{ textAlign: "right" }}>Avg Sold</th>
                  <th>Samples</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredBenchmarks.map((b) => (
                  <tr key={b.id}>
                    <td>{b.manufacturer}</td>
                    <td>{b.model}</td>
                    <td>{b.classification ?? "—"}</td>
                    <td style={{ textAlign: "right" }} className="money">{formatCurrency(b.supplier_unit_cost)}</td>
                    <td style={{ textAlign: "right" }} className="money">{formatCurrency(b.adjusted_cost)}</td>
                    <td style={{ textAlign: "right", color: "var(--success-600)" }} className="money">{formatCurrency(b.target_material_price)}</td>
                    <td style={{ textAlign: "right" }} className="money">{b.sold_average != null ? formatCurrency(b.sold_average) : "—"}</td>
                    <td>{b.quote_sample_size}</td>
                    <td>
                      <span className={`badge ${b.pricing_status === "verified" ? "badge-approved" : b.pricing_status === "historical" ? "badge-sent" : "badge-dismissed"}`}>
                        {b.pricing_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-muted mt-4">
          Pricing formula: Adjusted Cost = Supplier Cost x {COST_ESCALATION}. Target Price = Adjusted Cost x {MATERIAL_MARKUP}.
          Historical averages require enough comparable sold estimates with known model, dimensions and scope.
        </p>
      </div>
    </div>
  );
}
