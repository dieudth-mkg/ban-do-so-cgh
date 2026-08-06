import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login";
import MapPage from "./pages/MapPage";
import Dashboard from "./pages/Dashboard";
import SupplyDemand from "./pages/SupplyDemand";
import DataManagement from "./pages/DataManagement";
import HtxManagement from "./pages/HtxManagement";
import OwnerManagement from "./pages/OwnerManagement";
import MachineManagement from "./pages/MachineManagement";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import AppIntegration from "./pages/AppIntegration";
import CategoryConfig from "./pages/CategoryConfig";
import Monitoring from "./pages/Monitoring";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/map" element={<MapPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/supply-demand" element={<SupplyDemand />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/htx-management" element={<HtxManagement />} />
            <Route path="/owner-management" element={<OwnerManagement />} />
            <Route path="/machine-management" element={<MachineManagement />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/account-management" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="/app-integration" element={<ProtectedRoute adminOnly><AppIntegration /></ProtectedRoute>} />
            <Route path="/category-config" element={<ProtectedRoute adminOnly><CategoryConfig /></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute adminOnly><Monitoring /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
