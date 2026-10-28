import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CirclePlus as PlusCircle, FileText, Search } from "lucide-react";
import { fetchEstimates, updateEstimateStatus } from "@/lib/data";
import { dbStatus } from "@/lib/data";
import { statusLabel } from "@/lib/mockData";
import { formatCurrency } from "@/lib/pricing";
import type { Estimate, EstimateStatus } from "@/types";

const statusOptions: EstimateStatus[] = ["draft", "sent", "sold", "dismissed", "approved", "archived"];

export function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEstimates();
      setEstimates(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load estimates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: string, status: EstimateStatus) => {
    try {
      await updateEstimateStatus(id, status);
      setEstimates((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status.");
    }
  };

  const filtered = estimates.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.job_reference?.toLowerCase().includes(q) ||
      e.customer_name?.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="loading-center"><div className="spinner" /> Loading estimates...</div>;
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={20} />
            Estimates
          </div>
          <Link to="/estimates/new" className="btn btn-primary btn-sm">
            <PlusCircle size={16} />
            New Estimate
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-field mb-4">
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--neutral-400)" }} />
            <input
              type="text"
              placeholder="Search by job ref, customer, or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-state-icon" />
            <h3>No estimates found</h3>
            <p className="text-muted mt-2">Create a new estimate to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job Ref</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((est) => (
                  <tr key={est.id}>
                    <td>{est.job_reference || "—"}</td>
                    <td>{est.customer_name || "—"}</td>
                    <td>
                      <select
                        value={est.status}
                        onChange={(e) => handleStatusChange(est.id, e.target.value as EstimateStatus)}
                        className="status-select"
                        style={{
                          fontSize: "0.75rem",
                          padding: "4px 28px 4px 10px",
                          borderRadius: "var(--radius-xl)",
                          border: "1px solid var(--neutral-200)",
                          fontWeight: 600,
                          width: "auto",
                        }}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }} className="money">
                      {formatCurrency(est.owner_override_price ?? est.total)}
                    </td>
                    <td className="text-muted">{new Date(est.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/estimates/${est.id}`} className="btn btn-outline btn-sm">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dbStatus.usingMock && (
          <p className="text-muted mt-4">
            Showing sample data. Estimates will be saved to the live database when connected.
          </p>
        )}
      </div>
    </div>
  );
}
