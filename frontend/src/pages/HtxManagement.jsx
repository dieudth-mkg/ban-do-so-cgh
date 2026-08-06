import { Toaster } from "sonner";
import { useAuth } from "../lib/auth";
import { HTXTab, PageHeader, ReadOnlyBanner } from "./DataManagement";

export default function HtxManagement() {
  const { user } = useAuth();
  const readOnly = user?.role !== "admin";
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="htx-management-page">
      <Toaster position="top-right" richColors />
      <PageHeader title="Quản lý HTX" desc="Hồ sơ hợp tác xã và diện tích canh tác" />
      <ReadOnlyBanner readOnly={readOnly} />
      <HTXTab readOnly={readOnly} />
    </div>
  );
}