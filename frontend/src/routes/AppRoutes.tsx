import { LibraryRoute } from "./LibraryRoute";
import { LibraryLayout } from "../layouts/LibraryLayout";
import { LibraryQueuePage } from "../pages/library/LibraryQueuePage";
import { LibraryDisposalPage } from "../pages/library/LibraryDisposalPage";
import { LibraryCreditsPage } from "../pages/library/LibraryCreditsPage";
import { StudentRoute } from "./StudentRoute";
import { StudentLayout } from "../layouts/StudentLayout";
import { DashboardPage } from "../pages/student/DashboardPage";
import { NewDisposalPage } from "../pages/student/NewDisposalPage";
import { DisposalsPage } from "../pages/student/DisposalsPage";
import { DisposalDetailPage } from "../pages/student/DisposalDetailPage";
import { EcoCoinsPage } from "../pages/student/EcoCoinsPage";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { CategoriesPage } from "../pages/admin/CategoriesPage";
import { EquipmentPage } from "../pages/admin/EquipmentPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { AdminRoute } from "./AdminRoute";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<StudentRoute />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="disposals/new" element={<NewDisposalPage />} />
              <Route path="disposals" element={<DisposalsPage />} />
              <Route path="disposals/:id" element={<DisposalDetailPage />} />
              <Route path="ecocoins" element={<EcoCoinsPage />} />
              <Route path="*" element={<Navigate to="/student" replace />} />
            </Route>
          </Route>
          <Route element={<LibraryRoute />}>
            <Route path="/library" element={<LibraryLayout />}>
              <Route index element={<Navigate to="disposals" replace />} />
              <Route path="disposals" element={<LibraryQueuePage />} />
              <Route path="disposals/:id" element={<LibraryDisposalPage />} />
              <Route path="credits" element={<LibraryCreditsPage />} />
              <Route
                path="*"
                element={<Navigate to="/library/disposals" replace />}
              />
            </Route>
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="categories" replace />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="equipment" element={<EquipmentPage />} />
              <Route
                path="*"
                element={<Navigate to="/admin/categories" replace />}
              />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
