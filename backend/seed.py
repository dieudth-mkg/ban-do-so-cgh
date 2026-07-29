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
    {"category_code": "MC01", "ha_per_machine_per_season": 60.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC02", "ha_per_machine_per_season": 80.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC03", "ha_per_machine_per_season": 100.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC04", "ha_per_machine_per_season": 70.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
    {"category_code": "MC05", "ha_per_machine_per_season": 120.0, "document_ref": "QĐ 2311/QĐ-BNN-KTHTPT"},
]


# 24 sample HTX distributed across 6 provinces
HTX_SAMPLES = [
    # Cần Thơ
    ("CT-HTX01", "HTX Nông nghiệp Thới Lai", "Nguyễn Văn Bình", "CT", 10.10, 105.60, 1250),
    ("CT-HTX02", "HTX Lúa Vàng Ô Môn", "Trần Thị Lan", "CT", 10.11, 105.63, 890),
    ("CT-HTX03", "HTX Cờ Đỏ Xanh", "Lê Văn Minh", "CT", 9.98, 105.68, 1520),
    ("CT-HTX04", "HTX Phong Điền", "Phạm Thị Hồng", "CT", 10.02, 105.75, 640),
    # An Giang
    ("AG-HTX01", "HTX Long Xuyên Tiến", "Võ Văn Sáu", "AG", 10.50, 105.10, 2100),
    ("AG-HTX02", "HTX Châu Thành Phát", "Nguyễn Thị Bảy", "AG", 10.45, 105.30, 1780),
    ("AG-HTX03", "HTX Tri Tôn Xanh", "Trần Văn Tám", "AG", 10.40, 104.95, 950),
    ("AG-HTX04", "HTX Tịnh Biên Nông", "Lê Thị Chín", "AG", 10.60, 105.00, 1450),
    # Vĩnh Long
    ("VL-HTX01", "HTX Tam Bình Mới", "Nguyễn Văn Đức", "VL", 10.06, 106.00, 780),
    ("VL-HTX02", "HTX Bình Minh Xanh", "Phạm Văn Long", "VL", 10.03, 105.85, 1020),
    ("VL-HTX03", "HTX Long Hồ Lúa", "Hoàng Thị Mai", "VL", 10.28, 105.98, 660),
    ("VL-HTX04", "HTX Mang Thít Phú", "Vũ Văn Nam", "VL", 10.19, 106.10, 890),
    # Đồng Tháp
    ("DT-HTX01", "HTX Tháp Mười Vàng", "Đỗ Văn Hùng", "DT", 10.55, 105.85, 1650),
    ("DT-HTX02", "HTX Cao Lãnh Nông", "Bùi Thị Hà", "DT", 10.46, 105.63, 1230),
    ("DT-HTX03", "HTX Sa Đéc Xanh", "Ngô Văn Kiên", "DT", 10.30, 105.75, 720),
    ("DT-HTX04", "HTX Hồng Ngự Lúa", "Tô Thị Loan", "DT", 10.80, 105.36, 1400),
    # Tây Ninh
    ("TN-HTX01", "HTX Trảng Bàng Nông", "Lý Văn Phú", "TN", 11.03, 106.35, 850),
    ("TN-HTX02", "HTX Gò Dầu Phát", "Đinh Thị Quỳnh", "TN", 11.10, 106.20, 620),
    ("TN-HTX03", "HTX Tân Biên Xanh", "Chu Văn Rạng", "TN", 11.53, 106.03, 480),
    ("TN-HTX04", "HTX Hòa Thành Mới", "Kiều Thị Sen", "TN", 11.28, 106.13, 730),
    # Cà Mau
    ("CM-HTX01", "HTX U Minh Xanh", "Lâm Văn Tài", "CM", 9.42, 105.05, 1180),
    ("CM-HTX02", "HTX Cái Nước Phát", "Trịnh Thị Uyên", "CM", 9.00, 105.03, 940),
    ("CM-HTX03", "HTX Đầm Dơi Vàng", "Đặng Văn Việt", "CM", 8.98, 105.30, 1050),
    ("CM-HTX04", "HTX Năm Căn Nông", "Mai Thị Xuân", "CM", 8.75, 105.05, 810),
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
        await db["provinces"].update_one({"code": p["code"]}, {"$setOnInsert": {**p, "active": True}}, upsert=True)

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
            {"$setOnInsert": {**n, "effective_from": "2025-01-01T00:00:00+00:00"}},
            upsert=True,
        )

    # Alert thresholds
    await db["alert_thresholds"].update_one(
        {"key": "default"},
        {"$setOnInsert": {"key": "default", "sufficient_min": 0.95, "slight_min": 0.70}},
        upsert=True,
    )

    # HTX
    for code, name, owner, prov, lat, lng, area in HTX_SAMPLES:
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
                "commune": "",
                "lat": lat,
                "lng": lng,
                "cultivated_area_ha": area,
                "phone": f"09{random.randint(10000000, 99999999)}",
                "active": True,
                "created_at": "2025-01-01T00:00:00+00:00",
            }},
            upsert=True,
        )

    # Machines - generate random count per HTX per category
    machines_col = db["machines"]
    existing_count = await machines_col.count_documents({})
    if existing_count == 0:
        random.seed(42)
        machines = []
        for code, name, owner, prov, lat, lng, area in HTX_SAMPLES:
            for cat in MACHINE_CATEGORIES:
                # Random supply: sometimes short, sometimes sufficient
                # Base need
                norm = next(n["ha_per_machine_per_season"] for n in NORMS if n["category_code"] == cat["code"])
                needed = area / norm
                # Randomly assign 40%-130% of needed
                factor = random.uniform(0.4, 1.3)
                count = max(0, int(round(needed * factor)))
                for i in range(count):
                    machines.append({
                        "id": f"{code}-{cat['code']}-{i+1:03d}",
                        "htx_id": code,
                        "owner_name": owner,
                        "category_code": cat["code"],
                        "serial_no": f"{code}-{cat['code']}-SN{random.randint(10000, 99999)}",
                        "horsepower": round(random.uniform(30, 150), 1),
                        "status": random.choices(
                            ["hoat_dong", "bao_tri", "hong"],
                            weights=[85, 10, 5], k=1
                        )[0],
                        "condition_notes": "",
                        "created_at": "2025-01-01T00:00:00+00:00",
                    })
        if machines:
            await machines_col.insert_many(machines)
        logs.append(f"machines:{len(machines)}")

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
