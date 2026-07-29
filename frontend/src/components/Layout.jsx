import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Map, LayoutDashboard, Scale, BarChart3, Settings,
  LogOut, Sprout, ChevronRight, UserCog, RefreshCw,
} from "lucide-react";
import { useAuth } from "../lib/auth";

const items = [
  { to: "/map", label: "Bản đồ số", icon: Map, testid: "nav-map" },
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/supply-demand", label: "Cân đối & Cảnh báo", icon: Scale, testid: "nav-supply-demand" },
  { to: "/reports", label: "Báo cáo & Xuất dữ liệu", icon: BarChart3, testid: "nav-reports" },
];

const adminItems = [
  { to: "/data-management", label: "Quản lý HTX & Máy", icon: UserCog, testid: "nav-data-management" },
  { to: "/admin", label: "Quản trị & Cấu hình", icon: Settings, testid: "nav-admin" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!user) { navigate("/login"); return null; }

  const isAdmin = user.role === "admin";
  const activeCrumb =
    [...items, ...adminItems].find((i) => location.pathname.startsWith(i.to))?.label
    || "MekongGreen";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside
        className="w-[260px] bg-[#0B1120] text-slate-100 flex flex-col fixed h-screen z-30"
        data-testid="sidebar"
      >
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00A82D] to-[#00A3E0] flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" strokeWidth={2.4} />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">MekongGreen</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">DCRD</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 pb-2 text-[10px] uppercase tracking-widest text-slate-500">Điều hướng</div>
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={it.testid}
              className={({ isActive }) =>
                `mkg-sidenav-item flex items-center gap-3 px-5 py-3 text-sm border-l-2 border-transparent hover:bg-white/5`
              }
            >
              {({ isActive }) => (
                <span
                  data-active={isActive}
                  className="mkg-sidenav-item flex items-center gap-3 w-full"
                >
                  <it.icon className="w-4 h-4" />
                  <span>{it.label}</span>
                </span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-widest text-slate-500">
                Quản trị viên
              </div>
              {adminItems.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  data-testid={it.testid}
                  className="mkg-sidenav-item flex items-center gap-3 px-5 py-3 text-sm border-l-2 border-transparent hover:bg-white/5"
                >
                  {({ isActive }) => (
                    <span data-active={isActive} className="mkg-sidenav-item flex items-center gap-3 w-full">
                      <it.icon className="w-4 h-4" />
                      <span>{it.label}</span>
                    </span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#00A3E0] flex items-center justify-center text-sm font-semibold">
              {user.full_name?.[0] || user.email?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" data-testid="user-name">{user.full_name}</div>
              <div className="text-[11px] text-slate-400">
                {user.role === "admin" ? "Quản trị viên" : "Cán bộ Cục"}
              </div>
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-white/5 hover:bg-white/10 text-sm border border-white/10"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-14 bg-white/70 backdrop-blur-xl border-b border-slate-200 flex items-center px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Hệ Thống Bản Đồ Số Cơ Giới Hóa</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">{activeCrumb}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ HTX App: Tự động</span>
            </div>
          </div>
        </header>
        <main className="flex-1"><Outlet /></main>
      </div>
    </div>
  );
}
