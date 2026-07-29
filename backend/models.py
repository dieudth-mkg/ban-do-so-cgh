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


# ---------- ADMIN UNITS ----------
class Province(BaseModel):
    id: str = Field(default_factory=_uid)
    code: str
    name: str
    lat: float
    lng: float
    active: bool = True


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


# ---------- PRODUCTIVITY NORM ----------
class ProductivityNorm(BaseModel):
    id: str = Field(default_factory=_uid)
    category_code: str
    ha_per_machine_per_season: float
    document_ref: str  # số hiệu văn bản Cục
    effective_from: str = Field(default_factory=_now_iso)


class ProductivityNormCreate(BaseModel):
    category_code: str
    ha_per_machine_per_season: float
    document_ref: str


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


# ---------- MACHINE ----------
class Machine(BaseModel):
    id: str = Field(default_factory=_uid)
    htx_id: str
    owner_name: str
    category_code: str
    serial_no: str  # Số khung/Biển số/Mã máy
    horsepower: float = 0
    status: Literal["hoat_dong", "bao_tri", "hong", "chua_co_du_lieu"] = "hoat_dong"
    condition_notes: str = ""
    created_at: str = Field(default_factory=_now_iso)


class MachineCreate(BaseModel):
    htx_id: str
    category_code: str
    serial_no: str
    horsepower: float = 0
    status: str = "hoat_dong"
    condition_notes: str = ""


# ---------- ALERT THRESHOLDS ----------
class AlertThreshold(BaseModel):
    id: str = Field(default_factory=_uid)
    sufficient_min: float = 0.95   # tỷ lệ đáp ứng >= 0.95 → đủ
    slight_min: float = 0.70       # 0.70 - 0.95 → thiếu nhẹ
    # < 0.70 → thiếu nghiêm trọng


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
