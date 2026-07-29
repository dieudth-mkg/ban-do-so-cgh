"""MekongGreen - FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import Optional, List
from io import BytesIO
from datetime import datetime, timezone
from openpyxl import load_workbook, Workbook
import httpx
import random

from models import (
    UserCreate, LoginRequest, ChangePasswordRequest,
    HTX, HTXCreate, Machine, MachineCreate,
    MachineCategory, MachineCategoryCreate,
    ProductivityNorm, ProductivityNormCreate,
)
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin,
)
from seed import seed_all, PROVINCES, STAGES, SEASONS, MACHINE_CATEGORIES, NORMS
from exports import build_excel, build_pdf
from geojson_data import PROVINCE_GEOJSON


# Season demand factor - applied to cultivated_area_ha when computing needed machines
SEASON_FACTOR = {"DX": 1.0, "HT": 0.9, "TD": 0.6, "ALL": 1.0}

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="MekongGreen API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("mekonggreen")
logging.basicConfig(level=logging.INFO)


# ============ HEALTH ============
@api.get("/")
async def root():
    return {"service": "MekongGreen", "status": "ok"}


# ============ AUTH ============
@api.post("/auth/login")
async def login(payload: LoginRequest):
    doc = await db.users.find_one({"email": payload.email})
    if not doc or not doc.get("active", True):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if not verify_password(payload.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    token = create_token(doc["id"], doc["email"], doc["role"])
    await db.system_logs.insert_one({
        "id": f"log-{datetime.now(timezone.utc).timestamp()}",
        "actor_email": doc["email"],
        "action": "LOGIN",
        "detail": "",
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "token": token,
        "user": {
            "id": doc["id"],
            "email": doc["email"],
            "full_name": doc["full_name"],
            "role": doc["role"],
            "must_change_password": doc.get("must_change_password", False),
        },
    }


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    doc = await db.users.find_one({"email": user["email"]}, {"_id": 0, "password_hash": 0})
    return doc


@api.post("/auth/change-password")
async def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user)):
    doc = await db.users.find_one({"email": user["email"]})
    if not doc or not verify_password(payload.old_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")
    await db.users.update_one(
        {"email": user["email"]},
        {"$set": {"password_hash": hash_password(payload.new_password), "must_change_password": False}},
    )
    return {"ok": True}


# ============ PROVINCES / DIRECTORIES ============
@api.get("/provinces")
async def list_provinces():
    docs = await db.provinces.find({}, {"_id": 0}).to_list(200)
    return docs


@api.get("/stages")
async def list_stages():
    return await db.stages.find({}, {"_id": 0}).to_list(50)


@api.get("/seasons")
async def list_seasons():
    return await db.seasons.find({}, {"_id": 0}).to_list(50)


# ============ MACHINE CATEGORIES ============
@api.get("/machine-categories")
async def list_categories(user=Depends(get_current_user)):
    return await db.machine_categories.find({}, {"_id": 0}).to_list(200)


@api.post("/machine-categories")
async def create_category(body: MachineCategoryCreate, user=Depends(require_admin)):
    existing = await db.machine_categories.find_one({"code": body.code})
    if existing:
        raise HTTPException(status_code=400, detail="Mã chủng loại đã tồn tại")
    doc = MachineCategory(**body.model_dump()).model_dump()
    await db.machine_categories.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.patch("/machine-categories/{code}")
async def update_category(code: str, body: dict, user=Depends(require_admin)):
    allowed = {k: v for k, v in body.items() if k in ("name", "stage", "active")}
    await db.machine_categories.update_one({"code": code}, {"$set": allowed})
    return {"ok": True}


# ============ PRODUCTIVITY NORMS ============
@api.get("/productivity-norms")
async def list_norms(user=Depends(get_current_user)):
    return await db.productivity_norms.find({}, {"_id": 0}).to_list(200)


@api.post("/productivity-norms")
async def upsert_norm(body: ProductivityNormCreate, user=Depends(require_admin)):
    await db.productivity_norms.update_one(
        {"category_code": body.category_code},
        {"$set": {
            **body.model_dump(),
            "effective_from": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    await db.system_logs.insert_one({
        "id": f"log-{datetime.now(timezone.utc).timestamp()}",
        "actor_email": user["email"],
        "action": "UPDATE_NORM",
        "detail": f"category={body.category_code}, ha/machine={body.ha_per_machine_per_season}",
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


# ============ HTX ============
@api.get("/htx")
async def list_htx(
    province: Optional[str] = None,
    q: Optional[str] = None,
    user=Depends(get_current_user),
):
    query = {}
    if province and province != "ALL":
        query["province_code"] = province
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}},
            {"owner_name": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.htx.find(query, {"_id": 0}).to_list(2000)
    return docs


@api.post("/htx")
async def create_htx(body: HTXCreate, user=Depends(require_admin)):
    if await db.htx.find_one({"code": body.code}):
        raise HTTPException(status_code=400, detail="Mã HTX đã tồn tại")
    doc = HTX(**body.model_dump()).model_dump()
    doc["id"] = doc["code"]
    await db.htx.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.patch("/htx/{code}")
async def update_htx(code: str, body: dict, user=Depends(require_admin)):
    allowed = {k: v for k, v in body.items() if k in (
        "name", "owner_name", "owner_type", "province_code", "district",
        "commune", "lat", "lng", "cultivated_area_ha", "phone", "active"
    )}
    result = await db.htx.update_one({"code": code}, {"$set": allowed})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy HTX")
    return {"ok": True}


@api.delete("/htx/{code}")
async def deactivate_htx(code: str, user=Depends(require_admin)):
    await db.htx.update_one({"code": code}, {"$set": {"active": False}})
    return {"ok": True}


# ============ HTX EXCEL IMPORT ============
HTX_IMPORT_COLUMNS = [
    "code", "name", "owner_name", "province_code",
    "district", "commune", "lat", "lng", "cultivated_area_ha", "phone",
]


@api.get("/htx/import-template")
async def htx_import_template(user=Depends(require_admin)):
    """Download an Excel template for HTX bulk import."""
    wb = Workbook()
    ws = wb.active
    ws.title = "HTX_Template"
    ws.append(HTX_IMPORT_COLUMNS)
    # example rows
    ws.append(["CT-HTX99", "HTX Mẫu", "Nguyễn Văn A", "CT", "Ô Môn", "Thới An", 10.10, 105.60, 850, "0901234567"])
    ws.append(["AG-HTX99", "HTX Mẫu An Giang", "Trần Thị B", "AG", "Châu Đốc", "Vĩnh Mỹ", 10.70, 105.10, 1200, "0912345678"])
    for i, col in enumerate(ws.columns, 1):
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = max(14, max_len + 2)
    bio = BytesIO(); wb.save(bio)
    return StreamingResponse(
        BytesIO(bio.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="htx-import-template.xlsx"'},
    )


@api.post("/htx/import-excel")
async def import_htx_excel(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    user=Depends(require_admin),
):
    """Bulk import HTX from an .xlsx file. Returns row-level validation report."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận tệp .xlsx")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Tệp vượt quá 10MB")
    try:
        wb = load_workbook(BytesIO(content), data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không đọc được tệp Excel: {e}")
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="Tệp trống hoặc chỉ có tiêu đề")
    header = [str(c).strip() if c is not None else "" for c in rows[0]]

    # map column index
    col_idx = {name: (header.index(name) if name in header else -1) for name in HTX_IMPORT_COLUMNS}
    missing = [k for k, v in col_idx.items() if v == -1 and k in ("code", "name", "owner_name", "province_code", "lat", "lng", "cultivated_area_ha")]
    if missing:
        raise HTTPException(status_code=400, detail=f"Thiếu cột bắt buộc: {', '.join(missing)}")

    prov_codes = {p["code"] for p in PROVINCES}
    ok_rows, error_rows, skipped_rows = [], [], []

    for r_i, r in enumerate(rows[1:], start=2):
        if all(c is None or str(c).strip() == "" for c in r):
            continue
        record = {}
        errors = []
        for k, idx in col_idx.items():
            record[k] = r[idx] if idx >= 0 and idx < len(r) else None

        # required
        for f in ("code", "name", "owner_name", "province_code", "lat", "lng", "cultivated_area_ha"):
            if record.get(f) in (None, ""):
                errors.append(f"Thiếu {f}")
        # province valid
        if record.get("province_code") and str(record["province_code"]).strip() not in prov_codes:
            errors.append(f"province_code không hợp lệ (chấp nhận: {', '.join(sorted(prov_codes))})")
        # numeric
        try:
            lat = float(record["lat"]); lng = float(record["lng"])
            if not (8.0 <= lat <= 24.0) or not (102.0 <= lng <= 110.0):
                errors.append("lat/lng ngoài phạm vi Việt Nam")
            record["lat"], record["lng"] = lat, lng
        except (TypeError, ValueError):
            errors.append("lat/lng phải là số")
        try:
            area = float(record["cultivated_area_ha"])
            if area <= 0:
                errors.append("cultivated_area_ha phải > 0")
            record["cultivated_area_ha"] = area
        except (TypeError, ValueError):
            errors.append("cultivated_area_ha phải là số")

        code = str(record.get("code") or "").strip()
        if not errors and code:
            existing = await db.htx.find_one({"code": code})
            if existing:
                skipped_rows.append({"row": r_i, "code": code, "reason": "Đã tồn tại"})
                continue

        if errors:
            error_rows.append({"row": r_i, "code": code, "errors": errors})
        else:
            record["code"] = code
            record["name"] = str(record["name"]).strip()
            record["owner_name"] = str(record["owner_name"]).strip()
            record["province_code"] = str(record["province_code"]).strip()
            record["district"] = str(record.get("district") or "").strip()
            record["commune"] = str(record.get("commune") or "").strip()
            record["phone"] = str(record.get("phone") or "").strip()
            ok_rows.append({"row": r_i, **record})

    inserted = 0
    if not dry_run and ok_rows:
        for rec in ok_rows:
            doc = {
                "id": rec["code"],
                "code": rec["code"],
                "name": rec["name"],
                "owner_name": rec["owner_name"],
                "owner_type": "HTX",
                "province_code": rec["province_code"],
                "district": rec["district"],
                "commune": rec["commune"],
                "lat": rec["lat"],
                "lng": rec["lng"],
                "cultivated_area_ha": rec["cultivated_area_ha"],
                "phone": rec["phone"],
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.htx.insert_one(doc)
            inserted += 1
        await db.system_logs.insert_one({
            "id": f"log-{datetime.now(timezone.utc).timestamp()}",
            "actor_email": user["email"],
            "action": "IMPORT_HTX_EXCEL",
            "detail": f"file={file.filename}, inserted={inserted}, errors={len(error_rows)}, skipped={len(skipped_rows)}",
            "ts": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "filename": file.filename,
        "total_rows": len(rows) - 1,
        "ok_count": len(ok_rows),
        "error_count": len(error_rows),
        "skipped_count": len(skipped_rows),
        "inserted": inserted,
        "dry_run": dry_run,
        "errors": error_rows[:200],
        "skipped": skipped_rows[:200],
        "ok_preview": ok_rows[:20],
    }


# ============ GEOJSON PROVINCES ============
@api.get("/geojson/provinces")
async def geojson_provinces():
    """Return simplified GeoJSON polygons for the 6 provinces."""
    return PROVINCE_GEOJSON


# ============ HEATMAP HP/ha ============
@api.get("/map/heatmap")
async def map_heatmap(user=Depends(get_current_user)):
    """Return heat points [lat, lng, intensity] where intensity = HP density (HP/ha)."""
    htx_docs = await db.htx.find({"active": True}, {"_id": 0}).to_list(2000)
    machines = await db.machines.find({}, {"_id": 0}).to_list(20000)
    hp_by_htx: dict = {}
    for m in machines:
        hp_by_htx[m["htx_id"]] = hp_by_htx.get(m["htx_id"], 0) + m.get("horsepower", 0)
    points = []
    max_density = 0.0
    for h in htx_docs:
        area = h.get("cultivated_area_ha", 0)
        if not area:
            continue
        density = hp_by_htx.get(h["id"], 0) / area  # HP per ha
        max_density = max(max_density, density)
        points.append({"lat": h["lat"], "lng": h["lng"], "hp_per_ha": round(density, 3), "htx_code": h["code"]})
    return {"points": points, "max_density": round(max_density, 3)}


# ============ MACHINES ============
@api.get("/machines")
async def list_machines(
    htx_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    province: Optional[str] = None,
    user=Depends(get_current_user),
):
    query = {}
    if htx_id:
        query["htx_id"] = htx_id
    if category and category != "ALL":
        query["category_code"] = category
    if status and status != "ALL":
        query["status"] = status
    if province and province != "ALL":
        # get htx ids in province
        htx_ids = [h["id"] async for h in db.htx.find({"province_code": province}, {"id": 1})]
        query["htx_id"] = {"$in": htx_ids}
    docs = await db.machines.find(query, {"_id": 0}).to_list(5000)
    return docs


@api.post("/machines")
async def create_machine(body: MachineCreate, user=Depends(require_admin)):
    # QT-03: định danh duy nhất theo (owner + category + serial)
    htx = await db.htx.find_one({"id": body.htx_id})
    if not htx:
        raise HTTPException(status_code=404, detail="HTX không tồn tại")
    dup = await db.machines.find_one({
        "owner_name": htx["owner_name"],
        "category_code": body.category_code,
        "serial_no": body.serial_no,
    })
    if dup:
        raise HTTPException(status_code=400, detail="Máy đã tồn tại (Chủ sở hữu + Chủng loại + Số khung trùng)")
    m = Machine(**body.model_dump(), owner_name=htx["owner_name"]).model_dump()
    await db.machines.insert_one(m)
    return {k: v for k, v in m.items() if k != "_id"}


@api.patch("/machines/{machine_id}")
async def update_machine(machine_id: str, body: dict, user=Depends(require_admin)):
    allowed = {k: v for k, v in body.items() if k in (
        "category_code", "serial_no", "horsepower", "status", "condition_notes"
    )}
    await db.machines.update_one({"id": machine_id}, {"$set": allowed})
    return {"ok": True}


@api.delete("/machines/{machine_id}")
async def delete_machine(machine_id: str, user=Depends(require_admin)):
    await db.machines.delete_one({"id": machine_id})
    return {"ok": True}


# ============ MAP SUMMARY ============
@api.get("/map/htx-summary")
async def map_htx_summary(
    province: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    season: Optional[str] = None,
    user=Depends(get_current_user),
):
    """Return list of HTX with computed status color for map markers."""
    htx_query = {"active": True}
    if province and province != "ALL":
        htx_query["province_code"] = province
    htx_list = await db.htx.find(htx_query, {"_id": 0}).to_list(2000)

    norms_docs = await db.productivity_norms.find({}, {"_id": 0}).to_list(50)
    norms = {n["category_code"]: n["ha_per_machine_per_season"] for n in norms_docs}
    thr = await db.alert_thresholds.find_one({"key": "default"}) or {"sufficient_min": 0.95, "slight_min": 0.70}
    factor = SEASON_FACTOR.get(season or "DX", 1.0)

    m_query = {}
    if category and category != "ALL":
        m_query["category_code"] = category
    if status and status != "ALL":
        m_query["status"] = status

    all_machines = await db.machines.find(m_query, {"_id": 0}).to_list(20000)
    by_htx: dict = {}
    for m in all_machines:
        by_htx.setdefault(m["htx_id"], []).append(m)

    result = []
    for h in htx_list:
        machines = by_htx.get(h["id"], [])
        active = [x for x in machines if x["status"] == "hoat_dong"]
        # Compute weakest ratio across categories (or filtered category)
        cats = [category] if category and category != "ALL" else [c["code"] for c in MACHINE_CATEGORIES]
        min_ratio = None
        effective_area = h.get("cultivated_area_ha", 0) * factor
        for c in cats:
            norm = norms.get(c, 0)
            if not norm or not effective_area:
                continue
            needed = effective_area / norm
            have = len([x for x in active if x["category_code"] == c])
            ratio = have / needed if needed > 0 else 1.0
            if min_ratio is None or ratio < min_ratio:
                min_ratio = ratio
        if min_ratio is None:
            color = "gray"; label = "Chưa có dữ liệu"
        elif min_ratio >= thr["sufficient_min"]:
            color = "green"; label = "Đủ"
        elif min_ratio >= thr["slight_min"]:
            color = "amber"; label = "Thiếu nhẹ"
        else:
            color = "red"; label = "Thiếu nghiêm trọng"

        result.append({
            **h,
            "machine_count": len(machines),
            "active_count": len(active),
            "coverage_ratio": round(min_ratio, 3) if min_ratio is not None else None,
            "status_color": color,
            "status_label": label,
        })
    return result


@api.get("/map/htx/{htx_id}/detail")
async def htx_detail(htx_id: str, user=Depends(get_current_user)):
    h = await db.htx.find_one({"id": htx_id}, {"_id": 0})
    if not h:
        raise HTTPException(status_code=404, detail="HTX không tồn tại")
    machines = await db.machines.find({"htx_id": htx_id}, {"_id": 0}).to_list(2000)
    cats = await db.machine_categories.find({}, {"_id": 0}).to_list(50)
    norms_docs = await db.productivity_norms.find({}, {"_id": 0}).to_list(50)
    norms = {n["category_code"]: n["ha_per_machine_per_season"] for n in norms_docs}

    by_cat = []
    for c in cats:
        cms = [m for m in machines if m["category_code"] == c["code"]]
        active = [m for m in cms if m["status"] == "hoat_dong"]
        norm = norms.get(c["code"], 0)
        needed = (h["cultivated_area_ha"] / norm) if norm else 0
        by_cat.append({
            "category_code": c["code"],
            "category_name": c["name"],
            "stage": c["stage"],
            "have": len(cms),
            "active": len(active),
            "needed": round(needed, 2),
            "coverage": round(len(active) / needed, 3) if needed > 0 else None,
        })
    return {"htx": h, "machines": machines, "by_category": by_cat}


# ============ DASHBOARD ============
@api.get("/dashboard/kpi")
async def dashboard_kpi(user=Depends(get_current_user)):
    total_htx = await db.htx.count_documents({"active": True})
    total_machines = await db.machines.count_documents({})
    active_machines = await db.machines.count_documents({"status": "hoat_dong"})
    htx_list = await db.htx.find({"active": True}, {"_id": 0}).to_list(2000)
    total_area = sum(h.get("cultivated_area_ha", 0) for h in htx_list)

    # coverage evaluation
    norms_docs = await db.productivity_norms.find({}, {"_id": 0}).to_list(50)
    norms = {n["category_code"]: n["ha_per_machine_per_season"] for n in norms_docs}
    thr = await db.alert_thresholds.find_one({"key": "default"}) or {"sufficient_min": 0.95, "slight_min": 0.70}

    machines = await db.machines.find({"status": "hoat_dong"}, {"_id": 0}).to_list(20000)
    by_htx: dict = {}
    for m in machines:
        by_htx.setdefault(m["htx_id"], []).append(m)

    sufficient = shortage_slight = shortage_severe = no_data = 0
    for h in htx_list:
        cats = [c["code"] for c in MACHINE_CATEGORIES]
        ratios = []
        for c in cats:
            norm = norms.get(c, 0)
            if not norm or not h.get("cultivated_area_ha"):
                continue
            needed = h["cultivated_area_ha"] / norm
            have = len([m for m in by_htx.get(h["id"], []) if m["category_code"] == c])
            if needed > 0:
                ratios.append(have / needed)
        if not ratios:
            no_data += 1
            continue
        mn = min(ratios)
        if mn >= thr["sufficient_min"]:
            sufficient += 1
        elif mn >= thr["slight_min"]:
            shortage_slight += 1
        else:
            shortage_severe += 1

    return {
        "total_htx": total_htx,
        "total_machines": total_machines,
        "active_machines": active_machines,
        "total_area_ha": round(total_area, 2),
        "sufficient_htx": sufficient,
        "shortage_slight_htx": shortage_slight,
        "shortage_severe_htx": shortage_severe,
        "no_data_htx": no_data,
    }


@api.get("/dashboard/charts")
async def dashboard_charts(user=Depends(get_current_user)):
    # Machines by category
    machines = await db.machines.find({}, {"_id": 0}).to_list(20000)
    cats = await db.machine_categories.find({}, {"_id": 0}).to_list(50)
    by_cat = []
    for c in cats:
        cnt = len([m for m in machines if m["category_code"] == c["code"]])
        by_cat.append({"name": c["name"], "value": cnt, "code": c["code"]})

    # Machines by province
    htx_docs = await db.htx.find({}, {"_id": 0}).to_list(2000)
    htx_prov = {h["id"]: h["province_code"] for h in htx_docs}
    provinces = await db.provinces.find({}, {"_id": 0}).to_list(50)
    by_prov = []
    for p in provinces:
        cnt = len([m for m in machines if htx_prov.get(m["htx_id"]) == p["code"]])
        area = sum(h.get("cultivated_area_ha", 0) for h in htx_docs if h["province_code"] == p["code"])
        by_prov.append({
            "province": p["name"],
            "machines": cnt,
            "area": round(area, 1),
            "density": round(cnt / area * 100, 2) if area > 0 else 0,
        })

    # HP density (HP per ha) per province
    hp_by_prov = []
    for p in provinces:
        total_hp = sum(m.get("horsepower", 0) for m in machines if htx_prov.get(m["htx_id"]) == p["code"])
        area = sum(h.get("cultivated_area_ha", 0) for h in htx_docs if h["province_code"] == p["code"])
        hp_by_prov.append({
            "province": p["name"],
            "hp_per_ha": round(total_hp / area, 3) if area > 0 else 0,
        })

    # Status distribution
    status_dist = [
        {"name": "Hoạt động", "value": len([m for m in machines if m["status"] == "hoat_dong"])},
        {"name": "Bảo trì", "value": len([m for m in machines if m["status"] == "bao_tri"])},
        {"name": "Hỏng", "value": len([m for m in machines if m["status"] == "hong"])},
    ]

    return {
        "by_category": by_cat,
        "by_province": by_prov,
        "hp_density": hp_by_prov,
        "status_distribution": status_dist,
    }


@api.get("/dashboard/priority-list")
async def priority_list(user=Depends(get_current_user)):
    """Return list of HTX with severe shortage."""
    summary = await map_htx_summary(user=user)
    critical = [h for h in summary if h["status_color"] == "red"]
    critical.sort(key=lambda x: x.get("coverage_ratio") or 1.0)
    return critical[:20]


# ============ SUPPLY-DEMAND ============
@api.get("/supply-demand")
async def supply_demand(
    province: Optional[str] = None,
    season: Optional[str] = "DX",
    user=Depends(get_current_user),
):
    factor = SEASON_FACTOR.get(season or "DX", 1.0)
    htx_q = {"active": True}
    if province and province != "ALL":
        htx_q["province_code"] = province
    htx_docs = await db.htx.find(htx_q, {"_id": 0}).to_list(2000)
    cats_docs = await db.machine_categories.find({}, {"_id": 0}).to_list(50)
    norms_docs = await db.productivity_norms.find({}, {"_id": 0}).to_list(50)
    norms = {n["category_code"]: n["ha_per_machine_per_season"] for n in norms_docs}
    thr = await db.alert_thresholds.find_one({"key": "default"}) or {"sufficient_min": 0.95, "slight_min": 0.70}

    htx_ids = [h["id"] for h in htx_docs]
    all_machines = await db.machines.find({"htx_id": {"$in": htx_ids}, "status": "hoat_dong"}, {"_id": 0}).to_list(20000)

    stages_rows = []
    provinces = sorted(set(h["province_code"] for h in htx_docs))
    prov_names = {p["code"]: p["name"] for p in await db.provinces.find({}, {"_id": 0}).to_list(50)}

    for cat in cats_docs:
        norm = norms.get(cat["code"], 0)
        for pcode in provinces:
            p_htx = [h for h in htx_docs if h["province_code"] == pcode]
            area = sum(h["cultivated_area_ha"] for h in p_htx) * factor
            needed = area / norm if norm else 0
            have = len([m for m in all_machines if m["category_code"] == cat["code"] and any(h["id"] == m["htx_id"] for h in p_htx)])
            diff = have - needed
            ratio = have / needed if needed > 0 else None
            if ratio is None:
                status = "no_data"; label = "Chưa có dữ liệu"
            elif ratio >= 1.05:
                status = "surplus"; label = f"Thừa {int(round(diff))}"
            elif ratio >= thr["sufficient_min"]:
                status = "ok"; label = "Đủ"
            elif ratio >= thr["slight_min"]:
                status = "slight"; label = f"Thiếu {int(round(-diff))}"
            else:
                status = "severe"; label = f"Thiếu {int(round(-diff))}"
            stages_rows.append({
                "province_code": pcode,
                "province_name": prov_names.get(pcode, pcode),
                "stage": cat["stage"],
                "category_code": cat["code"],
                "category_name": cat["name"],
                "cultivated_area_ha": round(area, 1),
                "needed": round(needed, 1),
                "have": have,
                "diff": round(diff, 1),
                "coverage": round(ratio, 3) if ratio is not None else None,
                "status": status,
                "label": label,
            })
    critical = [r for r in stages_rows if r["status"] == "severe"]
    critical.sort(key=lambda x: x["coverage"] or 1.0)
    return {"rows": stages_rows, "critical": critical[:10]}


# ============ REPORTS EXPORT ============
def _make_stream(data: bytes, filename: str, content_type: str):
    bio = BytesIO(data)
    return StreamingResponse(
        bio, media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api.get("/reports/summary-by-region")
async def report_summary_by_region(user=Depends(get_current_user)):
    provinces = await db.provinces.find({}, {"_id": 0}).to_list(50)
    htx_docs = await db.htx.find({}, {"_id": 0}).to_list(2000)
    machines = await db.machines.find({}, {"_id": 0}).to_list(20000)
    rows = []
    for p in provinces:
        p_htx = [h for h in htx_docs if h["province_code"] == p["code"]]
        htx_ids = [h["id"] for h in p_htx]
        p_machines = [m for m in machines if m["htx_id"] in htx_ids]
        active = [m for m in p_machines if m["status"] == "hoat_dong"]
        area = sum(h["cultivated_area_ha"] for h in p_htx)
        rows.append({
            "province": p["name"],
            "htx_count": len(p_htx),
            "machine_count": len(p_machines),
            "active_count": len(active),
            "area_ha": round(area, 1),
        })
    return rows


@api.get("/reports/export")
async def export_report(
    kind: str = Query(..., pattern="^(summary_by_region|supply_demand|htx_shortage)$"),
    fmt: str = Query(..., pattern="^(xlsx|pdf)$"),
    season: Optional[str] = Query("DX"),
    province: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    # Build filter suffix
    season_names = {s["code"]: s["name"] for s in SEASONS}
    prov_names = {p["code"]: p["name"] for p in PROVINCES}
    cat_names = {c["code"]: c["name"] for c in MACHINE_CATEGORIES}
    filter_parts = []
    if season and season != "ALL":
        filter_parts.append(f"Mùa vụ: {season_names.get(season, season)}")
    if province and province != "ALL":
        filter_parts.append(f"Tỉnh: {prov_names.get(province, province)}")
    if category and category != "ALL":
        filter_parts.append(f"Chủng loại: {cat_names.get(category, category)}")
    filter_suffix = " · ".join(filter_parts) if filter_parts else "Toàn bộ dữ liệu"

    if kind == "summary_by_region":
        # summary by region: optionally filter by province & category
        provinces_docs = await db.provinces.find({}, {"_id": 0}).to_list(50)
        if province and province != "ALL":
            provinces_docs = [p for p in provinces_docs if p["code"] == province]
        htx_docs = await db.htx.find({}, {"_id": 0}).to_list(2000)
        m_query = {}
        if category and category != "ALL":
            m_query["category_code"] = category
        machines = await db.machines.find(m_query, {"_id": 0}).to_list(20000)
        rows_data = []
        for p in provinces_docs:
            p_htx = [h for h in htx_docs if h["province_code"] == p["code"]]
            htx_ids = [h["id"] for h in p_htx]
            p_machines = [m for m in machines if m["htx_id"] in htx_ids]
            active = [m for m in p_machines if m["status"] == "hoat_dong"]
            area = sum(h["cultivated_area_ha"] for h in p_htx)
            rows_data.append({
                "province": p["name"],
                "htx_count": len(p_htx),
                "machine_count": len(p_machines),
                "active_count": len(active),
                "area_ha": round(area, 1),
            })
        headers = ["Tỉnh", "Số HTX", "Tổng số máy", "Máy hoạt động", "Diện tích (ha)"]
        rows = [[r["province"], r["htx_count"], r["machine_count"], r["active_count"], r["area_ha"]] for r in rows_data]
        title = f"Báo cáo Tổng hợp theo Khu vực — {filter_suffix}"
    elif kind == "supply_demand":
        sd = await supply_demand(province=province, season=season, user=user)
        rows_all = sd["rows"]
        if category and category != "ALL":
            rows_all = [r for r in rows_all if r["category_code"] == category]
        headers = ["Tỉnh", "Khâu", "Chủng loại máy", "Diện tích (ha)", "Nhu cầu", "Sẵn có", "Chênh lệch", "Trạng thái"]
        stage_names = {s["code"]: s["name"] for s in STAGES}
        rows = [[
            r["province_name"], stage_names.get(r["stage"], r["stage"]),
            r["category_name"], r["cultivated_area_ha"], r["needed"],
            r["have"], r["diff"], r["label"]
        ] for r in rows_all]
        title = f"Báo cáo Cân đối Cung – Cầu Máy móc — {filter_suffix}"
    else:  # htx_shortage
        summary = await map_htx_summary(province=province, category=category, season=season, user=user)
        shortages = [h for h in summary if h["status_color"] in ("red", "amber")]
        headers = ["Mã HTX", "Tên HTX", "Tỉnh", "Chủ sở hữu", "Diện tích", "Tổng máy", "Tỷ lệ đáp ứng", "Trạng thái"]
        rows = [[
            h["code"], h["name"], prov_names.get(h["province_code"], h["province_code"]),
            h["owner_name"], h["cultivated_area_ha"], h["machine_count"],
            f"{(h['coverage_ratio'] or 0) * 100:.1f}%", h["status_label"],
        ] for h in shortages]
        title = f"Báo cáo HTX Thừa/Thiếu Máy móc — {filter_suffix}"

    if fmt == "xlsx":
        data = build_excel(title, headers, rows)
        return _make_stream(data, f"{kind}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    else:
        data = build_pdf(title, headers, rows)
        return _make_stream(data, f"{kind}.pdf", "application/pdf")


# ============ ADMIN: USERS ============
@api.get("/admin/users")
async def list_users(user=Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(200)
    return docs


@api.post("/admin/users")
async def create_user(body: UserCreate, user=Depends(require_admin)):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    doc = {
        "id": body.email,
        "email": body.email,
        "full_name": body.full_name,
        "role": body.role,
        "active": True,
        "must_change_password": True,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("_id", "password_hash")}


@api.patch("/admin/users/{email}")
async def update_user(email: str, body: dict, user=Depends(require_admin)):
    allowed = {}
    if "full_name" in body: allowed["full_name"] = body["full_name"]
    if "role" in body: allowed["role"] = body["role"]
    if "active" in body: allowed["active"] = bool(body["active"])
    if "reset_password" in body and body["reset_password"]:
        allowed["password_hash"] = hash_password(body["reset_password"])
        allowed["must_change_password"] = True
    await db.users.update_one({"email": email}, {"$set": allowed})
    return {"ok": True}


# ============ SYNC LOGS - REAL HTTP INTEGRATION ============
DEFAULT_SYNC_URL = None  # resolved at runtime to internal mock endpoint

async def _get_sync_url() -> str:
    """Return configured HTX sync URL, or fall back to internal mock endpoint."""
    doc = await db.system_settings.find_one({"key": "htx_sync_url"}, {"_id": 0})
    if doc and doc.get("value"):
        return doc["value"]
    # Default to internal mock endpoint (self-reference)
    port = os.environ.get("BACKEND_INTERNAL_PORT", "8001")
    return f"http://localhost:{port}/api/mock-htx-app/machine-updates"


@api.get("/mock-htx-app/machine-updates")
async def mock_htx_app_machine_updates():
    """Synthetic external HTX-app endpoint. Returns machine status updates.
    In production this URL is replaced by the real HTX cooperative app.
    """
    # Sample 40-80 random machines and produce status changes
    machines = await db.machines.aggregate([{"$sample": {"size": random.randint(40, 80)}}]).to_list(200)
    updates = []
    for m in machines:
        new_status = random.choices(
            ["hoat_dong", "bao_tri", "hong"],
            weights=[80, 15, 5], k=1
        )[0]
        note = ""
        if new_status == "bao_tri":
            note = random.choice(["Bảo trì định kỳ", "Thay dầu & lọc", "Kiểm tra hộp số"])
        elif new_status == "hong":
            note = random.choice(["Hỏng động cơ", "Hư hệ thống điện", "Chờ phụ tùng"])
        updates.append({
            "htx_id": m["htx_id"],
            "category_code": m["category_code"],
            "serial_no": m["serial_no"],
            "status": new_status,
            "condition_notes": note,
            "reported_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"source": "HTX_APP_MOCK", "count": len(updates), "updates": updates}


@api.get("/admin/sync-logs")
async def sync_logs(user=Depends(require_admin)):
    return await db.sync_logs.find({}, {"_id": 0}).sort("started_at", -1).to_list(100)


@api.post("/admin/sync-logs/trigger")
async def trigger_sync(user=Depends(require_admin)):
    """Real HTTP integration: fetches machine status updates from configured
    HTX App endpoint and applies them to the local DB."""
    started_at = datetime.now(timezone.utc)
    started_iso = started_at.isoformat()
    sync_url = await _get_sync_url()
    updated = notfound = 0
    status = "success"
    err_msg = ""

    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(sync_url)
            resp.raise_for_status()
            payload = resp.json()
            updates = payload.get("updates", [])
            for u in updates:
                q = {
                    "htx_id": u.get("htx_id"),
                    "category_code": u.get("category_code"),
                    "serial_no": u.get("serial_no"),
                }
                r = await db.machines.update_one(q, {"$set": {
                    "status": u.get("status", "hoat_dong"),
                    "condition_notes": u.get("condition_notes", ""),
                }})
                if r.matched_count > 0:
                    updated += 1
                else:
                    notfound += 1
            records = len(updates)
    except Exception as e:
        status = "failed"
        err_msg = str(e)[:250]
        records = 0

    finished_at = datetime.now(timezone.utc)
    latency_ms = int((finished_at - started_at).total_seconds() * 1000)
    entry = {
        "id": f"sync-{int(started_at.timestamp())}",
        "source": "HTX_APP",
        "source_url": sync_url,
        "status": status,
        "records_processed": records,
        "updated_count": updated,
        "notfound_count": notfound,
        "latency_ms": latency_ms,
        "message": err_msg or f"Cập nhật {updated} máy · Không tìm thấy {notfound}",
        "started_at": started_iso,
        "finished_at": finished_at.isoformat(),
    }
    await db.sync_logs.insert_one(dict(entry))
    await db.system_logs.insert_one({
        "id": f"log-{finished_at.timestamp()}",
        "actor_email": user["email"],
        "action": "TRIGGER_SYNC",
        "detail": f"url={sync_url}, updated={updated}, notfound={notfound}",
        "ts": finished_iso if (finished_iso := finished_at.isoformat()) else "",
    })
    return {k: v for k, v in entry.items() if k != "_id"}


@api.get("/admin/settings")
async def get_settings(user=Depends(require_admin)):
    """Fetch mutable system settings (currently only htx_sync_url)."""
    doc = await db.system_settings.find_one({"key": "htx_sync_url"}, {"_id": 0})
    default_url = await _get_sync_url()
    return {
        "htx_sync_url": (doc or {}).get("value", ""),
        "default_htx_sync_url": default_url,
    }


@api.patch("/admin/settings")
async def update_settings(body: dict, user=Depends(require_admin)):
    if "htx_sync_url" in body:
        url = (body["htx_sync_url"] or "").strip()
        await db.system_settings.update_one(
            {"key": "htx_sync_url"},
            {"$set": {"key": "htx_sync_url", "value": url}},
            upsert=True,
        )
    return {"ok": True}


# ============ MACHINES EXCEL IMPORT ============
MACHINE_IMPORT_COLUMNS = [
    "htx_code", "category_code", "serial_no",
    "horsepower", "status", "condition_notes",
]
_ALLOWED_MACHINE_STATUS = {"hoat_dong", "bao_tri", "hong"}


@api.get("/machines/import-template")
async def machines_import_template(user=Depends(require_admin)):
    wb = Workbook()
    ws = wb.active
    ws.title = "Machines_Template"
    ws.append(MACHINE_IMPORT_COLUMNS)
    ws.append(["CT-HTX01", "MC01", "SAMPLE-CAY-001", 90, "hoat_dong", ""])
    ws.append(["CT-HTX01", "MC04", "SAMPLE-GAT-002", 120, "bao_tri", "Thay dầu định kỳ"])
    for col in ws.columns:
        max_len = max(len(str(c.value or "")) for c in col)
        ws.column_dimensions[col[0].column_letter].width = max(14, max_len + 2)
    bio = BytesIO(); wb.save(bio)
    return StreamingResponse(
        BytesIO(bio.getvalue()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="machines-import-template.xlsx"'},
    )


@api.post("/machines/import-excel")
async def import_machines_excel(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    user=Depends(require_admin),
):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận tệp .xlsx")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Tệp vượt quá 10MB")
    try:
        wb = load_workbook(BytesIO(content), data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không đọc được tệp Excel: {e}")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="Tệp trống hoặc chỉ có tiêu đề")
    header = [str(c).strip() if c is not None else "" for c in rows[0]]
    col_idx = {name: (header.index(name) if name in header else -1) for name in MACHINE_IMPORT_COLUMNS}
    missing = [k for k, v in col_idx.items() if v == -1 and k in ("htx_code", "category_code", "serial_no")]
    if missing:
        raise HTTPException(status_code=400, detail=f"Thiếu cột bắt buộc: {', '.join(missing)}")

    htx_map = {h["code"]: h for h in await db.htx.find({}, {"_id": 0}).to_list(2000)}
    cat_codes = {c["code"] for c in await db.machine_categories.find({}, {"_id": 0}).to_list(50)}
    ok_rows, error_rows, skipped_rows = [], [], []

    for r_i, r in enumerate(rows[1:], start=2):
        if all(c is None or str(c).strip() == "" for c in r):
            continue
        rec = {k: (r[idx] if 0 <= idx < len(r) else None) for k, idx in col_idx.items()}
        errors = []
        htx_code = str(rec.get("htx_code") or "").strip()
        cat_code = str(rec.get("category_code") or "").strip()
        serial_no = str(rec.get("serial_no") or "").strip()

        if not htx_code:
            errors.append("Thiếu htx_code")
        elif htx_code not in htx_map:
            errors.append(f"htx_code không tồn tại")
        if not cat_code:
            errors.append("Thiếu category_code")
        elif cat_code not in cat_codes:
            errors.append(f"category_code không hợp lệ")
        if not serial_no:
            errors.append("Thiếu serial_no")

        try:
            hp = float(rec.get("horsepower") or 0)
            rec["horsepower"] = hp
        except (TypeError, ValueError):
            errors.append("horsepower phải là số"); hp = 0
        status_v = str(rec.get("status") or "hoat_dong").strip()
        if status_v not in _ALLOWED_MACHINE_STATUS:
            errors.append(f"status không hợp lệ ({', '.join(sorted(_ALLOWED_MACHINE_STATUS))})")
        notes = str(rec.get("condition_notes") or "").strip()

        # Duplicate check: (owner + category + serial)
        if not errors:
            owner = htx_map[htx_code]["owner_name"]
            dup = await db.machines.find_one({
                "owner_name": owner, "category_code": cat_code, "serial_no": serial_no,
            })
            if dup:
                skipped_rows.append({"row": r_i, "serial_no": serial_no, "reason": "Đã tồn tại"})
                continue

        if errors:
            error_rows.append({"row": r_i, "serial_no": serial_no, "errors": errors})
        else:
            ok_rows.append({
                "row": r_i, "htx_code": htx_code, "category_code": cat_code,
                "serial_no": serial_no, "horsepower": hp, "status": status_v,
                "condition_notes": notes,
            })

    inserted = 0
    if not dry_run and ok_rows:
        docs = []
        for rec in ok_rows:
            htx = htx_map[rec["htx_code"]]
            docs.append({
                "id": f"{rec['htx_code']}-{rec['category_code']}-{rec['serial_no']}",
                "htx_id": htx["id"],
                "owner_name": htx["owner_name"],
                "category_code": rec["category_code"],
                "serial_no": rec["serial_no"],
                "horsepower": rec["horsepower"],
                "status": rec["status"],
                "condition_notes": rec["condition_notes"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        if docs:
            await db.machines.insert_many(docs)
            inserted = len(docs)
        await db.system_logs.insert_one({
            "id": f"log-{datetime.now(timezone.utc).timestamp()}",
            "actor_email": user["email"],
            "action": "IMPORT_MACHINES_EXCEL",
            "detail": f"file={file.filename}, inserted={inserted}, errors={len(error_rows)}",
            "ts": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "filename": file.filename,
        "total_rows": len(rows) - 1,
        "ok_count": len(ok_rows),
        "error_count": len(error_rows),
        "skipped_count": len(skipped_rows),
        "inserted": inserted,
        "dry_run": dry_run,
        "errors": error_rows[:200],
        "skipped": skipped_rows[:200],
        "ok_preview": ok_rows[:20],
    }


# ============ SYSTEM LOGS ============
@api.get("/admin/system-logs")
async def system_logs(user=Depends(require_admin)):
    return await db.system_logs.find({}, {"_id": 0}).sort("ts", -1).to_list(200)


# ============ ALERT THRESHOLDS ============
@api.get("/admin/thresholds")
async def get_thresholds(user=Depends(get_current_user)):
    doc = await db.alert_thresholds.find_one({"key": "default"}, {"_id": 0})
    return doc or {"sufficient_min": 0.95, "slight_min": 0.70}


@api.patch("/admin/thresholds")
async def update_thresholds(body: dict, user=Depends(require_admin)):
    allowed = {}
    if "sufficient_min" in body: allowed["sufficient_min"] = float(body["sufficient_min"])
    if "slight_min" in body: allowed["slight_min"] = float(body["slight_min"])
    await db.alert_thresholds.update_one(
        {"key": "default"}, {"$set": allowed}, upsert=True
    )
    return {"ok": True}


# ============ REGISTER ROUTER ============
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    logs = await seed_all(db)
    logger.info(f"Seed done: {logs}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
