import { Toaster } from "sonner";
import { useAuth } from "../lib/auth";
import { MachinesTab, PageHeader, ReadOnlyBanner } from "./DataManagement";

export default function MachineManagement() {
  const { user } = useAuth();
  const readOnly = user?.role !== "admin";
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="machine-management-page">
      <Toaster position="top-right" richColors />
      <PageHeader title="Quản lý máy móc" desc="Hồ sơ máy móc – thiết bị, lịch sử biến động" />
      <ReadOnlyBanner readOnly={readOnly} />
      <MachinesTab readOnly={readOnly} />
    </div>
  );
}