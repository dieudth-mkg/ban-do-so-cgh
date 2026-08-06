import { Toaster } from "sonner";
import { SyncTab } from "./Admin";

// FN-06 tách riêng khỏi FN-11 theo BRD.
export default function AppIntegration() {
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="app-integration-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Tích hợp App HTX</h1>
        <p className="text-sm text-slate-500 mt-1">
          Đồng bộ tình trạng máy, diện tích canh tác và lịch mùa vụ. Chỉ Admin giám sát và xử lý lỗi.
        </p>
      </div>
      <SyncTab />
    </div>
  );
}
