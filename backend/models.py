"""Pydantic models for MekongGreen system."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid.uuid4())


# ---------- USER ----------
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    full_name: str
    role: Literal["admin", "staff"] = "staff"
    active: bool = True
    must_change_password: bool = False


class User(UserBase):
    id: str = Field(default_factory=_uid)
    password_hash: str
    created_at: str = Field(default_factory=_now_iso)


class UserPublic(UserBase):
    id: str
    created_at: str


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: Literal["admin", "staff"] = "staff"
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ---------- ADMIN UNITS (FN-01 nhóm 3: Đơn vị hành chính) ----------
class Province(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str            # Mã đơn vị
    name: str            # Tỉnh
    lat: float
    lng: float
    effective_from: str = Field(default_factory=_now_iso)   # Ngày hiệu lực
    active: bool = True   # BR-02: đổi địa giới → đóng hiệu lực (active=False), không xóa


class ProvinceUpdate(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    effective_from: Optional[str] = None
    active: Optional[bool] = None


# ---------- MACHINE CATEGORY ----------
class MachineCategory(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str
    name: str
    stage: str  # LAM_DAT, GIEO_SA, CHAM_SOC, THU_HOACH, SAU_THU_HOACH
    active: bool = True


class MachineCategoryCreate(BaseModel):
    code: str
    name: str
    stage: str
    active: bool = True


# ---------- FN-01 nhóm 1: Khâu sản xuất ----------
class ProductionStage(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str
    name: str
    active: bool = True
    # FN-07/BR-06: only pilot-enabled stages participate in map coverage.
    pilot_enabled: bool = True


class ProductionStageCreate(BaseModel):
    code: str
    name: str
    active: bool = True
    pilot_enabled: bool = True


# ---------- FN-01 nhóm 2: Tên vụ sản xuất ----------
class SeasonType(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str
    name: str
    active: bool = True


class SeasonTypeCreate(BaseModel):
    code: str
    name: str
    active: bool = True


# ---------- PRODUCTIVITY NORM (FN-01 nhóm 4: Định mức diện tích/máy/vụ) ----------
class ProductivityNorm(BaseModel):
    id: str = Field(default_factory=_uid)
    category_code: str          # Chủng loại
    stage_code: str = ""        # Khâu — cùng Chủng loại × Khâu tạo thành khoá định mức (BR-04/FN-01)
    ha_per_machine_per_season: float
    document_ref: str           # Số/ngày văn bản DCRD ban hành — căn cứ pháp lý (BR-01)
    effective_from: str = Field(default_factory=_now_iso)   # Ngày hiệu lực (từ)
    effective_to: Optional[str] = None                       # Ngày hiệu lực (đến) — bỏ trống = còn hiệu lực
    active: bool = True                                       # Trạng thái hiệu lực (BR-03: ngừng hiệu lực, không xóa cứng)


class ProductivityNormCreate(BaseModel):
    category_code: str
    stage_code: str = ""
    ha_per_machine_per_season: float
    document_ref: str
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None


# ---------- HTX ----------
class HTX(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str
    name: str
    owner_name: str
    owner_type: str = "HTX"  # đồng bộ từ App HTX
    province_code: str
    district: str = ""
    commune: str = ""
    lat: float
    lng: float
    cultivated_area_ha: float
    phone: str = ""
    active: bool = True
    created_at: str = Field(default_factory=_now_iso)


class HTXCreate(BaseModel):
    code: str
    name: str
    owner_name: str
    owner_type: str = "HTX"
    province_code: str
    district: str = ""
    commune: str = ""
    lat: float
    lng: float
    cultivated_area_ha: float
    phone: str = ""


# ---------- MACHINE (FN-04) ----------
MachineStatus = Literal["hoat_dong", "bao_tri", "hong", "chua_co_du_lieu"]
# BR-04: nhãn nguồn của tình trạng
StatusSource = Literal["app_htx", "manual", "no_data"]


class Machine(BaseModel):
    id: str = Field(default_factory=_uid)             # PK nội bộ
    code: str = ""                                    # Mã máy — hệ thống TỰ SINH (BR-01)
    htx_id: str                                       # BR-02: đúng một HTX (bắt buộc)
    owner_id: Optional[str] = None                    # liên kết FN-03 (khi có)
    owner_name: str = ""                              # denormalized để hiển thị
    category_code: str                                # khâu TỰ GÁN theo đây (BR-02)
    brand: str = ""                                   # Hãng
    model: str = ""                                   # Model
    year_made: Optional[int] = None                   # Năm SX
    fuel: str = ""                                    # Nhiên liệu
    horsepower: float = 0                             # Công suất (HP)
    productivity: float = 0                           # Năng suất
    serial_no: str = ""                               # Số máy/SN — khoá định danh chính (BR-01)
    chassis_no: str = ""                              # Số khung — khoá phụ (BR-01)
    status: MachineStatus = "hoat_dong"
    status_source: StatusSource = "manual"            # BR-04
    status_updated_at: str = Field(default_factory=_now_iso)
    condition_notes: str = ""
    owned_since: str                                  # Ngày HTX sở hữu/tiếp nhận — bắt buộc (BR-08)
    active: bool = True                               # soft-delete (BR-05)
    deactivated_at: Optional[str] = None              # Ngày vô hiệu hóa (BR-08)
    created_at: str = Field(default_factory=_now_iso)


class MachineCreate(BaseModel):
    htx_id: str
    category_code: str
    owner_id: Optional[str] = None
    owner_name: str = ""
    brand: str = ""
    model: str = ""
    year_made: Optional[int] = None
    fuel: str = ""
    horsepower: float = 0
    productivity: float = 0
    serial_no: str = ""
    chassis_no: str = ""
    status: MachineStatus = "hoat_dong"
    condition_notes: str = ""
    owned_since: str                                  # bắt buộc (BR-08)


# ---------- MACHINE HISTORY — Lịch sử biến động (BR-07) ----------
class MachineHistory(BaseModel):
    id: str = Field(default_factory=_uid)
    machine_id: str
    machine_code: str = ""
    # create | update | status | deactivate | reactivate | import_create | import_update
    change_type: str
    source: str = "manual"                            # manual | excel | app_htx
    actor: str = ""                                   # email người thực hiện / hệ thống
    field: str = ""                                   # trường thay đổi (nếu có)
    before: Optional[str] = None
    after: Optional[str] = None
    owned_since: Optional[str] = None                 # ghi khi thêm mới (BR-05 luồng)
    deactivated_at: Optional[str] = None              # ghi khi vô hiệu hóa (BR-08)
    ts: str = Field(default_factory=_now_iso)


# ---------- OWNER — Hồ sơ chủ sở hữu máy (FN-03) ----------
OwnerType = Literal["THANH_VIEN_HTX", "HTX", "DOANH_NGHIEP", "DON_VI_KHAC"]


class Owner(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str = ""                                    # Mã CSH — hệ thống TỰ SINH
    name: str
    owner_type: OwnerType = "THANH_VIEN_HTX"
    phone: str = ""
    htx_id: Optional[str] = None                      # HTX liên kết
    active: bool = True                               # soft-delete
    created_at: str = Field(default_factory=_now_iso)


class OwnerCreate(BaseModel):
    name: str
    owner_type: OwnerType = "THANH_VIEN_HTX"
    phone: str = ""
    htx_id: Optional[str] = None


# ---------- ALERT THRESHOLDS (FN-01 nhóm 5: Ngưỡng cảnh báo cung-cầu / QT-02) ----------
class AlertThreshold(BaseModel):
    id: str = Field(default_factory=_uid)
    sufficient_min: float = 0.95   # Đủ: tỷ lệ đáp ứng >= mốc này
    slight_min: float = 0.70       # Cần chú ý: slight_min <= tỷ lệ < sufficient_min
    # < slight_min → Thiếu (nghiêm trọng)
    excess_min: float = 1.20       # Thừa: tỷ lệ đáp ứng >= mốc này
    effective_from: str = Field(default_factory=_now_iso)


# ---------- SYSTEM PARAMETERS (FN-01 nhóm 6: Tham số hệ thống) ----------
class SystemParams(BaseModel):
    id: str = Field(default_factory=_uid)
    key: str = "default"
    basemap_source: str = "OpenStreetMap"          # Nguồn bản đồ nền
    import_allowed_extensions: str = ".xlsx,.xls"  # Định dạng import cho phép
    import_max_rows: int = 5000                     # Giới hạn số dòng import
    import_max_file_size_mb: float = 10             # Giới hạn dung lượng file import (MB)
    data_freshness_threshold_hours: int = 24         # Ngưỡng "độ tươi" dữ liệu App HTX (FN-05/FN-06)


# ---------- SYNC LOG (mock) ----------
class SyncLog(BaseModel):
    id: str = Field(default_factory=_uid)
    source: str = "HTX_APP"
    status: Literal["success", "failed", "running"] = "success"
    records_processed: int = 0
    message: str = ""
    started_at: str = Field(default_factory=_now_iso)
    finished_at: Optional[str] = None


# ---------- SYSTEM LOG ----------
class SystemLog(BaseModel):
    id: str = Field(default_factory=_uid)
    actor_email: str
    action: str
    detail: str = ""
    ts: str = Field(default_factory=_now_iso)
