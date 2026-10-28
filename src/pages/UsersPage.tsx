import { useEffect, useState } from "react";
import { Users, UserPlus, Mail, Ban, CircleCheck as CheckCircle } from "lucide-react";
import { fetchMembers, updateMemberRole, toggleMemberActive } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import type { Member, UserRole } from "@/types";

export function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("sales");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const { session } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (userId === session?.user_id) {
      setError("You cannot change your own role.");
      return;
    }
    try {
      await updateMemberRole(userId, role);
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.");
    }
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    if (userId === session?.user_id) {
      setError("You cannot deactivate yourself.");
      return;
    }
    try {
      await toggleMemberActive(userId, active);
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, active } : m)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user.");
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inviteEmail.trim()) {
      setError("Enter an email address.");
      return;
    }
    setInviteMsg(`Invitation would be sent to ${inviteEmail}. In demo mode, user invites require Supabase Auth integration with the live project.`);
    setInviteEmail("");
  };

  if (loading) return <div className="loading-center"><div className="spinner" /> Loading users...</div>;

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={20} />
            User Management
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {inviteMsg && <div className="alert alert-info">{inviteMsg}</div>}

        {/* Invite form */}
        <div className="card" style={{ background: "var(--neutral-50)", padding: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <h4 style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <UserPlus size={16} /> Invite New User
          </h4>
          <form onSubmit={handleInvite} className="form-row">
            <div className="form-field" style={{ flex: 2 }}>
              <label>Email Address</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="newuser@tripleagaragedoorsinc.com" />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label>Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)}>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">
              <Mail size={16} /> Send Invite
            </button>
          </form>
        </div>

        {/* Members table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.full_name || "—"}</td>
                  <td>{m.email}</td>
                  <td>
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value as UserRole)}
                      disabled={m.user_id === session?.user_id}
                      style={{ fontSize: "0.75rem", padding: "4px 24px 4px 8px", width: "auto", fontWeight: 600 }}
                    >
                      <option value="sales">Sales</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${m.active ? "badge-approved" : "badge-dismissed"}`}>
                      {m.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-muted">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td>
                    {m.user_id !== session?.user_id && (
                      m.active ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(m.user_id, false)} title="Deactivate">
                          <Ban size={14} /> Deactivate
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(m.user_id, true)} title="Reactivate">
                          <CheckCircle size={14} /> Reactivate
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="alert alert-info mt-4">
          <strong>Role permissions:</strong>
          <ul style={{ marginTop: "var(--space-2)", paddingLeft: "var(--space-5)", fontSize: "0.8125rem" }}>
            <li><strong>Owner</strong> — Full access: supplier costs, margins, pricing settings, users, reports</li>
            <li><strong>Admin</strong> — Manage staff, estimates, and operational workflows. No supplier-cost access</li>
            <li><strong>Sales</strong> — Create and manage estimates using approved selling prices only</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
