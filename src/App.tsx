import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, RoleGuard } from './components/auth';
import { MainLayout, PageLoader } from './components/layout';
import { UnauthorizedPage, NotFoundPage } from './pages/ErrorPages';
import { startKeepAlive } from './utils/keepAlive';

const LandingPage = lazy(() =>
  import('./pages/landing').then((m) => ({ default: m.LandingPage }))
);
const LoginPage = lazy(() =>
  import('./pages/auth').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/auth').then((m) => ({ default: m.RegisterPage }))
);

// Lazy load page components for code splitting
const ProductListPage = lazy(() =>
  import('./pages/catalog').then((m) => ({ default: m.ProductListPage }))
);
const InactiveProductListPage = lazy(() =>
  import('./pages/catalog').then((m) => ({ default: m.InactiveProductListPage }))
);
const ProductFormPage = lazy(() =>
  import('./pages/catalog').then((m) => ({ default: m.ProductFormPage }))
);
const CategoryPage = lazy(() =>
  import('./pages/catalog').then((m) => ({ default: m.CategoryPage }))
);
const POSPage = lazy(() =>
  import('./pages/pos').then((m) => ({ default: m.POSPage }))
);
const AlertListPage = lazy(() =>
  import('./pages/inventory').then((m) => ({
    default: m.AlertListPage,
  }))
);
const InventoryPage = lazy(() =>
  import('./pages/inventory').then((m) => ({
    default: m.InventoryPage,
  }))
);
const PurchaseOrderPage = lazy(() =>
  import('./pages/purchasing').then((m) => ({
    default: m.PurchaseOrderPage,
  }))
);
const SupplierPage = lazy(() =>
  import('./pages/purchasing').then((m) => ({
    default: m.SupplierPage,
  }))
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard').then((m) => ({
    default: m.DashboardPage,
  }))
);
const AuditListPage = lazy(() =>
  import('./pages/audit').then((m) => ({ default: m.AuditListPage }))
);
const WorkersPage = lazy(() =>
  import('./pages/settings').then((m) => ({ default: m.WorkersPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/settings').then((m) => ({ default: m.ProfilePage }))
);

function App() {
  startKeepAlive();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <AuthGuard>
              <Suspense fallback={<PageLoader />}>
                <MainLayout />
              </Suspense>
            </AuthGuard>
          }
        >
          {/* Default redirect based on role handled by LoginPage */}
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          {/* Profile - All authenticated users */}
          <Route
            path="profile"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'CASHIER', 'WAREHOUSE']}>
                <ProfilePage />
              </RoleGuard>
            }
          />

          {/* Dashboard - All authenticated users */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* POS - ADMIN and CASHIER only */}
          <Route
            path="pos"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'CASHIER']}>
                <POSPage />
              </RoleGuard>
            }
          />

          {/* Inventory - ADMIN and WAREHOUSE only */}
          <Route
            path="inventory"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <InventoryPage />
              </RoleGuard>
            }
          />

          {/* Alerts - ADMIN and WAREHOUSE only */}
          <Route
            path="alerts"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <AlertListPage />
              </RoleGuard>
            }
          />

          {/* Purchasing - ADMIN and WAREHOUSE only */}
          <Route
            path="purchasing"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <PurchaseOrderPage />
              </RoleGuard>
            }
          />
          <Route
            path="purchasing/suppliers"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <SupplierPage />
              </RoleGuard>
            }
          />

          {/* Catalog - read for all authenticated users, edits for ADMIN/WAREHOUSE */}
          <Route
            path="catalog"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE', 'CASHIER']}>
                <Navigate to="/app/catalog/products" replace />
              </RoleGuard>
            }
          />
          <Route
            path="catalog/products"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE', 'CASHIER']}>
                <ProductListPage />
              </RoleGuard>
            }
          />
          <Route
            path="catalog/products/inactive"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <InactiveProductListPage />
              </RoleGuard>
            }
          />
          <Route
            path="catalog/products/new"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <ProductFormPage />
              </RoleGuard>
            }
          />
          <Route
            path="catalog/products/:id/edit"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE']}>
                <ProductFormPage />
              </RoleGuard>
            }
          />
          <Route
            path="catalog/categories"
            element={
              <RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE', 'CASHIER']}>
                <CategoryPage />
              </RoleGuard>
            }
          />

          {/* Audit Trail - ADMIN only */}
          <Route
            path="audit"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AuditListPage />
              </RoleGuard>
            }
          />

          {/* Worker Management - ADMIN only */}
          <Route
            path="settings/workers"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <WorkersPage />
              </RoleGuard>
            }
          />

          {/* Catch-all interno — preserva sidebar/navbar */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
