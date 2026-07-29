"""MekongGreen - FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
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
        for c in cats:
            norm = norms.get(c, 0)
            if not norm or not h.get("cultivated_area_ha"):
                continue
            needed = h["cultivated_area_ha"] / norm
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
    season: Optional[str] = None,
    user=Depends(get_current_user),
):
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
            area = sum(h["cultivated_area_ha"] for h in p_htx)
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
    user=Depends(get_current_user),
):
    if kind == "summary_by_region":
        rows_data = await report_summary_by_region(user=user)
        headers = ["Tỉnh", "Số HTX", "Tổng số máy", "Máy hoạt động", "Diện tích (ha)"]
        rows = [[r["province"], r["htx_count"], r["machine_count"], r["active_count"], r["area_ha"]] for r in rows_data]
        title = "Báo cáo Tổng hợp theo Khu vực"
    elif kind == "supply_demand":
        sd = await supply_demand(user=user)
        headers = ["Tỉnh", "Khâu", "Chủng loại máy", "Diện tích (ha)", "Nhu cầu", "Sẵn có", "Chênh lệch", "Trạng thái"]
        stage_names = {s["code"]: s["name"] for s in STAGES}
        rows = [[
            r["province_name"], stage_names.get(r["stage"], r["stage"]),
            r["category_name"], r["cultivated_area_ha"], r["needed"],
            r["have"], r["diff"], r["label"]
        ] for r in sd["rows"]]
        title = "Báo cáo Cân đối Cung – Cầu Máy móc"
    else:  # htx_shortage
        summary = await map_htx_summary(user=user)
        shortages = [h for h in summary if h["status_color"] in ("red", "amber")]
        headers = ["Mã HTX", "Tên HTX", "Tỉnh", "Chủ sở hữu", "Diện tích", "Tổng máy", "Tỷ lệ đáp ứng", "Trạng thái"]
        prov_names = {p["code"]: p["name"] for p in PROVINCES}
        rows = [[
            h["code"], h["name"], prov_names.get(h["province_code"], h["province_code"]),
            h["owner_name"], h["cultivated_area_ha"], h["machine_count"],
            f"{(h['coverage_ratio'] or 0) * 100:.1f}%", h["status_label"],
        ] for h in shortages]
        title = "Báo cáo HTX Thừa/Thiếu Máy móc"

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


# ============ SYNC LOGS (MOCK) ============
@api.get("/admin/sync-logs")
async def sync_logs(user=Depends(require_admin)):
    return await db.sync_logs.find({}, {"_id": 0}).sort("started_at", -1).to_list(100)


@api.post("/admin/sync-logs/trigger")
async def trigger_sync(user=Depends(require_admin)):
    import random
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    entry = {
        "id": f"sync-{int(datetime.now(timezone.utc).timestamp())}",
        "source": "HTX_APP",
        "status": random.choice(["success", "success", "success", "failed"]),
        "records_processed": random.randint(500, 12000),
        "message": "Đồng bộ thủ công (Mock)",
        "started_at": now,
        "finished_at": now,
    }
    await db.sync_logs.insert_one(dict(entry))
    return {k: v for k, v in entry.items() if k != "_id"}


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
