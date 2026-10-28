import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DoorOpen, ArrowLeft, CircleCheck as CheckCircle2 } from "lucide-react";

export function LoginPage() {
  const { signIn, resetPassword, updatePassword, isRecovery, isMock } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [showResetSent, setShowResetSent] = useState(false);

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
    else {
      setInfo("If the account exists, a password reset email will arrive shortly. Check your inbox and click the link in the email to set a new password.");
      setShowResetSent(true);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setPasswordUpdated(true);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (isRecovery && !passwordUpdated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <DoorOpen size={40} />
            <h2>Set New Password</h2>
            <p className="text-muted">Choose a new password for your account</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleUpdatePassword}>
            <div className="form-field mb-4">
              <label>New Password (min 12 characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={12}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-field mb-4">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={12}
                autoComplete="new-password"
                required
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

  if (passwordUpdated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <CheckCircle2 size={40} style={{ color: "var(--success-500)" }} />
            <h2>Password Updated</h2>
          </div>
          <div className="alert alert-success" style={{ marginBottom: "var(--space-4)" }}>
            Your password has been changed successfully. You can now sign in with your new password.
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              setPasswordUpdated(false);
              setInfo(null);
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </button>
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
        {info && showResetSent && (
          <div className="alert alert-info">
            {info}
            <button
              className="btn btn-ghost btn-sm mt-2 w-full"
              onClick={() => {
                setShowResetSent(false);
                setInfo(null);
              }}
              style={{ justifyContent: "center" }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        )}
        {!showResetSent && (
          <>
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
            <button className="btn btn-ghost w-full mt-2" onClick={handleReset} disabled={loading}>
              {loading ? "Sending..." : "Reset Password"}
            </button>
          </>
        )}
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
