"""Seed data for MekongGreen system - idempotent."""
import random
from auth import hash_password


PROVINCES = [
    {"code": "CT", "name": "Cần Thơ", "lat": 10.0452, "lng": 105.7469},
    {"code": "AG", "name": "An Giang", "lat": 10.5215, "lng": 105.1259},
    {"code": "VL", "name": "Vĩnh Long", "lat": 10.2537, "lng": 105.9722},
    {"code": "DT", "name": "Đồng Tháp", "lat": 10.4938, "lng": 105.6882},
    {"code": "TN", "name": "Tây Ninh", "lat": 11.3100, "lng": 106.0983},
    {"code": "CM", "name": "Cà Mau", "lat": 9.1769, "lng": 105.1524},
]


MACHINE_CATEGORIES = [
    {"code": "MC01", "name": "Máy cày / Làm đất", "stage": "LAM_DAT"},
    {"code": "MC02", "name": "Máy gieo sạ", "stage": "GIEO_SA"},
    {"code": "MC03", "name": "Máy phun thuốc / BVTV", "stage": "CHAM_SOC"},
    {"code": "MC04", "name": "Máy gặt đập liên hợp", "stage": "THU_HOACH"},
    {"code": "MC05", "name": "Thiết bị sấy", "stage": "SAU_THU_HOACH"},
]


STAGES = [
    {"code": "LAM_DAT", "name": "Làm đất"},
    {"code": "GIEO_SA", "name": "Gieo sạ"},
    {"code": "CHAM_SOC", "name": "Chăm sóc"},
    {"code": "THU_HOACH", "name": "Thu hoạch"},
    {"code": "SAU_THU_HOACH", "name": "Sau thu hoạch"},
]


SEASONS = [
    {"code": "DX", "name": "Đông Xuân"},
    {"code": "HT", "name": "Hè Thu"},
    {"code": "TD", "name": "Thu Đông"},
]


NORMS = [
    {"category_code": "MC01", "stage_code": "LAM_DAT", "ha_per_machine_per_season": 60.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC02", "stage_code": "GIEO_SA", "ha_per_machine_per_season": 80.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC03", "stage_code": "CHAM_SOC", "ha_per_machine_per_season": 100.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC04", "stage_code": "THU_HOACH", "ha_per_machine_per_season": 70.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC05", "stage_code": "SAU_THU_HOACH", "ha_per_machine_per_season": 120.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
]


# 24 sample HTX distributed across 6 provinces
# tuple: (code, name, owner, province_code, lat, lng, area_ha, commune_name)
HTX_SAMPLES = [
    # Cần Thơ
    ("CT-HTX01", "HTX Nông nghiệp Thới Lai", "Nguyễn Văn Bình", "CT", 10.10, 105.60, 1250, "Xã Thới Lai"),
    ("CT-HTX02", "HTX Lúa Vàng Ô Môn", "Trần Thị Lan", "CT", 10.11, 105.63, 890, "Xã Thới Long"),
    ("CT-HTX03", "HTX Cờ Đỏ Xanh", "Lê Văn Minh", "CT", 9.98, 105.68, 1520, "Xã Trung Hưng"),
    ("CT-HTX04", "HTX Phong Điền", "Phạm Thị Hồng", "CT", 10.02, 105.75, 640, "Xã Nhơn Ái"),
    # An Giang
    ("AG-HTX01", "HTX Long Xuyên Tiến", "Võ Văn Sáu", "AG", 10.50, 105.10, 2100, "Xã Mỹ Hòa Hưng"),
    ("AG-HTX02", "HTX Châu Thành Phát", "Nguyễn Thị Bảy", "AG", 10.45, 105.30, 1780, "Xã Vĩnh Bình"),
    ("AG-HTX03", "HTX Tri Tôn Xanh", "Trần Văn Tám", "AG", 10.40, 104.95, 950, "Xã Ba Chúc"),
    ("AG-HTX04", "HTX Tịnh Biên Nông", "Lê Thị Chín", "AG", 10.60, 105.00, 1450, "Xã An Cư"),
    # Vĩnh Long
    ("VL-HTX01", "HTX Tam Bình Mới", "Nguyễn Văn Đức", "VL", 10.06, 106.00, 780, "Xã Tân Phú"),
    ("VL-HTX02", "HTX Bình Minh Xanh", "Phạm Văn Long", "VL", 10.03, 105.85, 1020, "Xã Thuận An"),
    ("VL-HTX03", "HTX Long Hồ Lúa", "Hoàng Thị Mai", "VL", 10.28, 105.98, 660, "Xã Phú Đức"),
    ("VL-HTX04", "HTX Mang Thít Phú", "Vũ Văn Nam", "VL", 10.19, 106.10, 890, "Xã An Phước"),
    # Đồng Tháp
    ("DT-HTX01", "HTX Tháp Mười Vàng", "Đỗ Văn Hùng", "DT", 10.55, 105.85, 1650, "Xã Mỹ An"),
    ("DT-HTX02", "HTX Cao Lãnh Nông", "Bùi Thị Hà", "DT", 10.46, 105.63, 1230, "Xã Mỹ Long"),
    ("DT-HTX03", "HTX Sa Đéc Xanh", "Ngô Văn Kiên", "DT", 10.30, 105.75, 720, "Xã Tân Khánh Đông"),
    ("DT-HTX04", "HTX Hồng Ngự Lúa", "Tô Thị Loan", "DT", 10.80, 105.36, 1400, "Xã Thường Phước"),
    # Tây Ninh
    ("TN-HTX01", "HTX Trảng Bàng Nông", "Lý Văn Phú", "TN", 11.03, 106.35, 850, "Xã An Tịnh"),
    ("TN-HTX02", "HTX Gò Dầu Phát", "Đinh Thị Quỳnh", "TN", 11.10, 106.20, 620, "Xã Phước Trạch"),
    ("TN-HTX03", "HTX Tân Biên Xanh", "Chu Văn Rạng", "TN", 11.53, 106.03, 480, "Xã Tân Bình"),
    ("TN-HTX04", "HTX Hòa Thành Mới", "Kiều Thị Sen", "TN", 11.28, 106.13, 730, "Xã Trường Đông"),
    # Cà Mau
    ("CM-HTX01", "HTX U Minh Xanh", "Lâm Văn Tài", "CM", 9.42, 105.05, 1180, "Xã Khánh An"),
    ("CM-HTX02", "HTX Cái Nước Phát", "Trịnh Thị Uyên", "CM", 9.00, 105.03, 940, "Xã Đông Hưng"),
    ("CM-HTX03", "HTX Đầm Dơi Vàng", "Đặng Văn Việt", "CM", 8.98, 105.30, 1050, "Xã Tân Duyệt"),
    ("CM-HTX04", "HTX Năm Căn Nông", "Mai Thị Xuân", "CM", 8.75, 105.05, 810, "Xã Hàm Rồng"),
]


async def seed_all(db):
    """Idempotent seeding."""
    logs = []

    # Users
    users_col = db["users"]
    seeds_users = [
        {"email": "admin@mekonggreen.vn", "full_name": "Quản trị viên MekongGreen", "role": "admin", "password": "admin123"},
        {"email": "canbo@dcrd.gov.vn", "full_name": "Cán bộ Cục DCRD", "role": "staff", "password": "canbo123"},
    ]
    for u in seeds_users:
        existing = await users_col.find_one({"email": u["email"]})
        if not existing:
            await users_col.insert_one({
                "id": u["email"],
                "email": u["email"],
                "full_name": u["full_name"],
                "role": u["role"],
                "active": True,
                "must_change_password": False,
                "password_hash": hash_password(u["password"]),
                "created_at": "2025-01-01T00:00:00+00:00",
            })
            logs.append(f"user:{u['email']}")

    # Provinces
    for p in PROVINCES:
        await db["provinces"].update_one(
            {"code": p["code"]},
            {"$setOnInsert": {**p, "active": True, "effective_from": "2025-01-01T00:00:00+00:00"}},
            upsert=True,
        )

    # Machine categories
    for c in MACHINE_CATEGORIES:
        await db["machine_categories"].update_one({"code": c["code"]}, {"$setOnInsert": {**c, "active": True}}, upsert=True)

    # Stages
    for s in STAGES:
        await db["stages"].update_one({"code": s["code"]}, {"$setOnInsert": s}, upsert=True)

    # Seasons
    for s in SEASONS:
        await db["seasons"].update_one({"code": s["code"]}, {"$setOnInsert": s}, upsert=True)

    # Norms
    for n in NORMS:
        await db["productivity_norms"].update_one(
            {"category_code": n["category_code"]},
            {"$setOnInsert": {
                **n, "active": True,
                "effective_from": "2025-01-01T00:00:00+00:00", "effective_to": None,
            }},
            upsert=True,
        )

    # Alert thresholds — mốc đề xuất theo BRD FN-01: Đủ ≥85% / Cần chú ý 60–<85% / Thiếu <60% / Thừa ≥120%
    await db["alert_thresholds"].update_one(
        {"key": "default"},
        {"$setOnInsert": {
            "key": "default", "sufficient_min": 0.85, "slight_min": 0.60, "excess_min": 1.20,
            "effective_from": "2025-01-01T00:00:00+00:00",
        }},
        upsert=True,
    )

    # System parameters (FN-01 nhóm 6)
    await db["system_params"].update_one(
        {"key": "default"},
        {"$setOnInsert": {
            "key": "default", "basemap_source": "OpenStreetMap",
            "import_allowed_extensions": ".xlsx,.xls",
            "import_max_rows": 5000, "import_max_file_size_mb": 10,
            "data_freshness_threshold_hours": 24,
        }},
        upsert=True,
    )

    # HTX
    for code, name, owner, prov, lat, lng, area, commune in HTX_SAMPLES:
        await db["htx"].update_one(
            {"code": code},
            {"$setOnInsert": {
                "id": code,
                "code": code,
                "name": name,
                "owner_name": owner,
                "owner_type": "HTX",
                "province_code": prov,
                "district": "",
                "commune": commune,
                "lat": lat,
                "lng": lng,
                "cultivated_area_ha": area,
                "phone": f"09{random.randint(10000000, 99999999)}",
                "active": True,
                "created_at": "2025-01-01T00:00:00+00:00",
            }},
            upsert=True,
        )
        # Ensure commune is filled on existing docs (migration)
        await db["htx"].update_one(
            {"code": code, "$or": [{"commune": ""}, {"commune": {"$exists": False}}]},
            {"$set": {"commune": commune}},
        )

    # Machines - versioned re-seed. v4 aligns with BRD FN-04:
    # Mã máy tự sinh, Số máy/SN + Số khung, Hãng/Model/Năm SX/Nhiên liệu/Năng suất,
    # Ngày HTX sở hữu, nhãn nguồn tình trạng, soft-delete, + Lịch sử biến động.
    machines_col = db["machines"]
    settings_col = db["system_settings"]
    seed_ver_doc = await settings_col.find_one({"key": "seed_version"})
    current_ver = (seed_ver_doc or {}).get("value", "")
    if current_ver != "v5":
        await machines_col.delete_many({})
        await db["machine_history"].delete_many({})
        await db["owners"].delete_many({})
        await db["counters"].delete_one({"_id": "machine_code"})
        await db["counters"].delete_one({"_id": "owner_code"})
        random.seed(1337)

        BRANDS = ["Kubota", "Yanmar", "John Deere", "Iseki", "Đông Phong"]
        FUELS = ["Diesel", "Xăng", "Điện"]
        OWNED_DATES = ["2024-03-01", "2024-06-15", "2024-09-01", "2025-01-15", "2025-03-01"]

        target_factors = [1.30, 1.10, 0.82, 0.55]
        machines, history, owners = [], [], []
        seq = owner_seq = 0
        for htx_idx, (code, name, owner, prov, lat, lng, area, commune) in enumerate(HTX_SAMPLES):
            base_factor = target_factors[htx_idx % 4]
            # FN-03: mỗi HTX có một chủ sở hữu loại HTX (Mã CSH tự sinh)
            owner_seq += 1
            owner_id = f"OWN-{code}"
            owners.append({
                "id": owner_id, "code": f"CSH-{owner_seq:05d}", "name": owner,
                "owner_type": "HTX", "phone": f"09{random.randint(10000000, 99999999)}",
                "htx_id": code, "active": True, "created_at": "2024-01-01T00:00:00+00:00",
            })
            for cat in MACHINE_CATEGORIES:
                norm = next(n["ha_per_machine_per_season"] for n in NORMS if n["category_code"] == cat["code"])
                needed = area / norm
                factor = base_factor * random.uniform(0.92, 1.08)
                count = max(0, int(round(needed * factor)))
                for i in range(count):
                    seq += 1
                    mid = f"{code}-{cat['code']}-{i+1:03d}"
                    mcode = f"MAY-{seq:05d}"
                    status = random.choices(["hoat_dong", "bao_tri", "hong"], weights=[85, 10, 5], k=1)[0]
                    owned = random.choice(OWNED_DATES)
                    created = f"{owned}T00:00:00+00:00"
                    machines.append({
                        "id": mid, "code": mcode, "htx_id": code,
                        "owner_id": owner_id, "owner_name": owner,
                        "category_code": cat["code"],
                        "brand": random.choice(BRANDS),
                        "model": f"M{random.randint(100, 999)}",
                        "year_made": random.randint(2015, 2024),
                        "fuel": random.choice(FUELS),
                        "horsepower": round(random.uniform(30, 150), 1),
                        "productivity": round(norm * random.uniform(0.9, 1.1), 1),
                        "serial_no": f"SN{random.randint(1000000, 9999999)}",
                        "chassis_no": f"KHUNG-{code}-{seq:05d}",
                        "status": status,
                        "status_source": "manual",           # nhập tay ban đầu (BR-04)
                        "status_updated_at": created,
                        "condition_notes": "",
                        "owned_since": owned,                 # BR-08
                        "active": True, "deactivated_at": None,
                        "created_at": created,
                    })
                    history.append({
                        "id": f"h-{mid}", "machine_id": mid, "machine_code": mcode,
                        "change_type": "create", "source": "manual", "actor": "seed",
                        "field": "", "before": None, "after": status,
                        "owned_since": owned, "deactivated_at": None, "ts": created,
                    })
        if machines:
            await machines_col.insert_many(machines)
            await db["machine_history"].insert_many(history)
        if owners:
            await db["owners"].insert_many(owners)
        # Đặt bộ đếm để bản ghi tạo sau tiếp tục đúng thứ tự
        await db["counters"].update_one(
            {"_id": "machine_code"}, {"$set": {"seq": seq}}, upsert=True,
        )
        await db["counters"].update_one(
            {"_id": "owner_code"}, {"$set": {"seq": owner_seq}}, upsert=True,
        )
        await settings_col.update_one(
            {"key": "seed_version"},
            {"$set": {"key": "seed_version", "value": "v5"}},
            upsert=True,
        )
        logs.append(f"machines_v5:{len(machines)}, owners:{len(owners)}")

    # Sync logs (mock)
    sync_col = db["sync_logs"]
    if await sync_col.count_documents({}) == 0:
        sample_logs = [
            {"id": "sync-001", "source": "HTX_APP", "status": "success", "records_processed": 1200, "message": "Đồng bộ danh bạ HTX thành công", "started_at": "2026-02-10T02:00:00+00:00", "finished_at": "2026-02-10T02:04:12+00:00"},
            {"id": "sync-002", "source": "HTX_APP", "status": "success", "records_processed": 8540, "message": "Đồng bộ tình trạng máy móc", "started_at": "2026-02-10T02:05:00+00:00", "finished_at": "2026-02-10T02:11:33+00:00"},
            {"id": "sync-003", "source": "HTX_APP", "status": "failed", "records_processed": 0, "message": "Timeout khi kết nối API HTX", "started_at": "2026-02-09T14:30:00+00:00", "finished_at": "2026-02-09T14:31:15+00:00"},
            {"id": "sync-004", "source": "HTX_APP", "status": "success", "records_processed": 3421, "message": "Đồng bộ khâu sản xuất & mùa vụ", "started_at": "2026-02-09T02:00:00+00:00", "finished_at": "2026-02-09T02:03:45+00:00"},
        ]
        await sync_col.insert_many(sample_logs)

    return logs