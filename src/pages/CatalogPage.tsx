import { useEffect, useState, useMemo } from "react";
import { BookOpen, Search } from "lucide-react";
import { fetchCatalog } from "@/lib/data";
import type { CatalogItem } from "@/types";

const categoryLabels: Record<string, string> = {
  door: "Garage Door",
  opener: "Opener",
  track: "Track",
  spring: "Spring",
  shaft: "Shaft",
  drum: "Drum",
  cable: "Cable",
  roller: "Roller",
  hinge: "Hinge",
  bracket: "Bracket",
  strut: "Strut",
  weatherstrip: "Weatherstrip",
  reinforcement: "Reinforcement",
  opener_accessory: "Opener Accessory",
};

export function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCatalog();
        setItems(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load catalog.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      return (
        item.manufacturer.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.color?.toLowerCase().includes(q)
      );
    });
  }, [items, search, category]);

  const categories = ["all", ...new Set(items.map((i) => i.category))];

  if (loading) return <div className="loading-center"><div className="spinner" /> Loading catalog...</div>;

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookOpen size={20} />
            Product Catalog
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-grid mb-4">
          <div className="form-field">
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--neutral-400)" }} />
              <input
                type="text"
                placeholder="Search by manufacturer, model, SKU, color..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
          <div className="form-field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : categoryLabels[c] ?? c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} className="empty-state-icon" />
            <h3>No products found</h3>
            <p className="text-muted mt-2">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {filtered.map((item) => (
              <div key={item.id} className="card" style={{ padding: "var(--space-4)", boxShadow: "var(--shadow-sm)" }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4>{item.manufacturer} {item.model}</h4>
                    <span className="badge badge-draft">{categoryLabels[item.category] ?? item.category}</span>
                  </div>
                </div>
                <div className="catalog-detail">
                  {item.sku && <div className="catalog-row"><span>SKU</span><strong className="font-mono">{item.sku}</strong></div>}
                  {item.classification && <div className="catalog-row"><span>Type</span><strong>{item.classification}</strong></div>}
                  {item.width_ft && <div className="catalog-row"><span>Size</span><strong>{item.width_ft}x{item.height_ft} ft</strong></div>}
                  {item.color && <div className="catalog-row"><span>Color</span><strong>{item.color}</strong></div>}
                  {item.insulation_type && <div className="catalog-row"><span>Insulation</span><strong>{item.insulation_type.replace(/_/g, " ")}</strong></div>}
                  {item.r_value && <div className="catalog-row"><span>R-Value</span><strong>{item.r_value}</strong></div>}
                  {item.steel_thickness && <div className="catalog-row"><span>Steel</span><strong>{item.steel_thickness}</strong></div>}
                  {item.lift_type && <div className="catalog-row"><span>Lift</span><strong>{item.lift_type.replace(/_/g, " ")}</strong></div>}
                  {item.spring_system && <div className="catalog-row"><span>Springs</span><strong>{item.spring_system}</strong></div>}
                  {item.drive_type && <div className="catalog-row"><span>Drive</span><strong>{item.drive_type}</strong></div>}
                  {item.horsepower && <div className="catalog-row"><span>HP</span><strong>{item.horsepower}</strong></div>}
                  {item.rail_length && <div className="catalog-row"><span>Rail</span><strong>{item.rail_length}</strong></div>}
                  {item.battery_backup !== null && <div className="catalog-row"><span>Battery Backup</span><strong>{item.battery_backup ? "Yes" : "No"}</strong></div>}
                  {item.wifi_compatible !== null && <div className="catalog-row"><span>Wi-Fi</span><strong>{item.wifi_compatible ? "Yes" : "No"}</strong></div>}
                  {item.warranty && <div className="catalog-row"><span>Warranty</span><strong>{item.warranty}</strong></div>}
                </div>
                {item.included_hardware && item.included_hardware.length > 0 && (
                  <div className="mt-2">
                    <span className="text-muted">Includes: </span>
                    <span>{item.included_hardware.join(", ")}</span>
                  </div>
                )}
                {item.supplier_ordering_notes && (
                  <div className="alert alert-info mt-2" style={{ fontSize: "0.75rem", padding: "8px 12px" }}>
                    {item.supplier_ordering_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
