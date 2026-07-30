import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Map,
  LayoutDashboard,
  Scale,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  UserCog,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../lib/auth";

const items = [
  { to: "/map", label: "Bản đồ số", icon: Map, testid: "nav-map" },
  {
    to: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    testid: "nav-dashboard",
  },
  {
    to: "/supply-demand",
    label: "Cân đối & Cảnh báo",
    icon: Scale,
    testid: "nav-supply-demand",
  },
  {
    to: "/reports",
    label: "Báo cáo & Xuất dữ liệu",
    icon: BarChart3,
    testid: "nav-reports",
  },
];

const adminItems = [
  {
    to: "/data-management",
    label: "Quản lý HTX & Máy",
    icon: UserCog,
    testid: "nav-data-management",
  },
  {
    to: "/admin",
    label: "Quản trị & Cấu hình",
    icon: Settings,
    testid: "nav-admin",
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const isAdmin = user.role === "admin";

  const activeCrumb =
    [...items, ...adminItems].find((i) =>
      location.pathname.startsWith(i.to)
    )?.label || "MekongGreen";

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* ================= SIDEBAR ================= */}
      <aside
        className="w-[260px] bg-white text-slate-700 flex flex-col fixed h-screen z-30 border-r border-slate-200 shadow-sm"
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <img
              src="/logo-mekonggreen.png"
              alt="MekongGreen"
              className="h-24 w-auto scale-[2] origin-center"
            />
            <span className="text-slate-300 text-lg font-light">×</span>
            <img
              src="/logo-dcrd.png"
              alt="DCRD"
              className="h-[68px] w-auto"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 pb-2 text-[10px] uppercase tracking-widest text-slate-400">
            Điều hướng
          </div>

          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={it.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm border-l-4 transition-all ${
                  isActive
                    ? "bg-cyan-50 border-cyan-500 text-cyan-700 font-semibold"
                    : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-cyan-700"
                }`
              }
            >
              <it.icon className="w-5 h-5" />
              <span>{it.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-widest text-slate-400">
                Quản trị viên
              </div>

              {adminItems.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  data-testid={it.testid}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 text-sm border-l-4 transition-all ${
                      isActive
                        ? "bg-cyan-50 border-cyan-500 text-cyan-700 font-semibold"
                        : "border-transparent text-slate-700 hover:bg-slate-100 hover:text-cyan-700"
                    }`
                  }
                >
                  <it.icon className="w-5 h-5" />
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center font-semibold">
              {user.full_name?.[0] || user.email?.[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold truncate text-slate-800"
                data-testid="user-name"
              >
                {user.full_name}
              </div>

              <div className="text-xs text-slate-500">
                {user.role === "admin"
                  ? "Quản trị viên"
                  : "Cán bộ Cục"}
              </div>
            </div>
          </div>

          <button
            data-testid="logout-btn"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Hệ Thống Bản Đồ Số Cơ Giới Hóa</span>

            <ChevronRight className="w-4 h-4" />

            <span className="font-semibold text-slate-800">
              {activeCrumb}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Đồng bộ HTX App: Tự động</span>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}