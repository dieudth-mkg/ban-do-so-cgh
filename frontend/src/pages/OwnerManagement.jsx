import { Toaster } from "sonner";
import { useAuth } from "../lib/auth";
import { OwnersTab, PageHeader, ReadOnlyBanner } from "./DataManagement";

export default function OwnerManagement() {
  const { user } = useAuth();
  const readOnly = user?.role !== "admin";
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="owner-management-page">
      <Toaster position="top-right" richColors />
      <PageHeader title="Quản lý chủ sở hữu" desc="Hồ sơ chủ sở hữu máy và liên kết với HTX" />
      <ReadOnlyBanner readOnly={readOnly} />
      <OwnersTab readOnly={readOnly} />
    </div>
  );
}