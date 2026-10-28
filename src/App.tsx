import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { EstimatesPage } from "@/pages/EstimatesPage";
import { EstimateBuilderPage } from "@/pages/EstimateBuilderPage";
import { QuickQuotePage } from "@/pages/QuickQuotePage";
import { CatalogPage } from "@/pages/CatalogPage";
import { PricebookPage } from "@/pages/PricebookPage";
import { UsersPage } from "@/pages/UsersPage";
import type { UserRole } from "@/types";

function ProtectedRoutes() {
  const { session, loading, isMock } = useAuth();

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <AppLayout isMock={isMock}>
      <Routes>
        <Route path="/" element={<Navigate to="/quick-quote" replace />} />
        <Route path="/quick-quote" element={<QuickQuotePage />} />
        <Route path="/estimates" element={<EstimatesPage />} />
        <Route path="/estimates/new" element={<EstimateBuilderPage />} />
        <Route path="/estimates/:id" element={<EstimateBuilderPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/pricebook" element={<RoleGuard role="owner"><PricebookPage /></RoleGuard>} />
        <Route path="/users" element={<RoleGuard role="owner"><UsersPage /></RoleGuard>} />
        <Route path="*" element={<Navigate to="/estimates" replace />} />
      </Routes>
    </AppLayout>
  );
}

function RoleGuard({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { session } = useAuth();
  if (session?.role !== role) {
    return (
      <div className="empty-state">
        <h3>Access restricted</h3>
        <p className="text-muted mt-2">This page requires {role} access.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
