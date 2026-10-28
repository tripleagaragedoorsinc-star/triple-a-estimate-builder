import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DoorOpen } from "lucide-react";

export function LoginPage() {
  const { signIn, resetPassword, updatePassword, isRecovery, isMock } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  };

  const handleReset = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) setError(error);
    else setInfo("If the account exists, a password reset email will arrive shortly.");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    setLoading(false);
    if (error) setError(error);
  };

  if (isRecovery) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <DoorOpen size={40} />
            <h2>Set New Password</h2>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleUpdatePassword}>
            <div className="form-field">
              <label>New Password (min 12 characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={12}
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Saving..." : "Save New Password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <DoorOpen size={40} />
          <h2>Triple A Garage Doors</h2>
          <p className="text-muted">Staff Sign In</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {info && <div className="alert alert-info">{info}</div>}
        <form onSubmit={handleSignIn}>
          <div className="form-field mb-4">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="form-field mb-4">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <button className="btn btn-ghost w-full mt-2" onClick={handleReset}>
          Reset Password
        </button>
        {isMock && (
          <div className="alert alert-info mt-4">
            Demo mode: use <strong>avic@tripleagaragedoorsinc.com</strong> (owner),
            <strong> admin@tripleagaragedoorsinc.com</strong> (admin), or
            <strong> sales@tripleagaragedoorsinc.com</strong> (sales). Any password works.
          </div>
        )}
      </div>
    </div>
  );
}
