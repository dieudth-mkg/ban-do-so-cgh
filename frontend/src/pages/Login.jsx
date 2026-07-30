import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { toast, Toaster } from "sonner";


export default function LoginPage() {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(email.trim(), password);
      toast.success(`Xin chào ${u.full_name}`);
      nav(u.role === "admin" ? "/map" : "/map");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="h-screen w-full flex" data-testid="login-page">
      <Toaster position="top-right" richColors />
      {/* LEFT VISUAL */}
      <div className="hidden lg:block relative w-1/2 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1764323064945-d064c30742b8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwxfHxjb21iaW5lJTIwaGFydmVzdGVyJTIwcmljZSUyMGZpZWxkfGVufDB8fHx8MTc4NTI5NzY5MXww&ixlib=rb-4.1.0&q=85"
          alt="Cánh đồng lúa & máy gặt"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,163,224,0.30)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <h1 className="font-display font-bold text-4xl xl:text-5xl leading-tight max-w-lg">
            Hiện đại hóa &amp; Cơ giới hóa Nông nghiệp Vùng ĐBSCL
          </h1>
          <p className="mt-4 text-white/85 max-w-md text-sm">
            Nền tảng bản đồ số quản lý cơ giới hóa toàn vùng — theo dõi tình trạng máy móc, cân đối cung – cầu và ra quyết định dựa trên dữ liệu.
          </p>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] px-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-6 mb-8">
            <img src="/logo-mekonggreen.png" alt="MekongGreen" className="h-60 w-auto" />
            <span className="text-slate-300 text-4xl font-light">×</span>
            <img src="/logo-dcrd.png" alt="DCRD" className="h-28 w-auto" />
          </div>

          <h2 className="font-display font-bold text-3xl text-slate-900 leading-tight">
            Hệ Thống Bản Đồ Số<br />Cơ Giới Hóa Nông Nghiệp
          </h2>
          <p className="text-sm text-slate-500 mt-2 mb-8">
            Đăng nhập bằng tài khoản được Quản trị viên cấp phát.
          </p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <label className="block">
              <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">Email</span>
              <div className="mt-1.5 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  data-testid="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@mekonggreen.vn"
                  className="w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00C4B4] focus:border-[#00C4B4]"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">Mật khẩu</span>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  data-testid="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00C4B4] focus:border-[#00C4B4]"
                />
              </div>
            </label>

            {err && (
              <div className="text-sm text-[#E74C3C] bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="login-error">
                {err}
              </div>
            )}

            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white font-medium transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Đăng nhập
            </button>

            <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5 mb-1"><ShieldCheck className="w-3.5 h-3.5 text-[#00A82D]" /> Tài khoản được cấp bởi Quản trị viên. Không có đăng ký công khai.</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="font-medium text-slate-700">Quản trị viên</div>
                  <div>admin@mekonggreen.vn</div>
                  <div>admin123</div>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <div className="font-medium text-slate-700">Cán bộ Cục</div>
                  <div>canbo@dcrd.gov.vn</div>
                  <div>canbo123</div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}