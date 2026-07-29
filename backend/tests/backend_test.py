"""MekongGreen backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://agri-map-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@mekonggreen.vn", "password": "admin123"}
STAFF = {"email": "canbo@dcrd.gov.vn", "password": "canbo123"}


# ============ Fixtures ============
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def staff_token():
    r = requests.post(f"{API}/auth/login", json=STAFF, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def h(token):
    return {"Authorization": f"Bearer {token}"}


# ============ Health ============
def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ============ Auth ============
def test_login_admin():
    r = requests.post(f"{API}/auth/login", json=ADMIN)
    assert r.status_code == 200
    j = r.json()
    assert "token" in j
    assert j["user"]["role"] == "admin"
    assert j["user"]["email"] == ADMIN["email"]


def test_login_staff():
    r = requests.post(f"{API}/auth/login", json=STAFF)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "staff"


def test_login_bad_credentials():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@mekonggreen.vn", "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_with_token(admin_token):
    r = requests.get(f"{API}/auth/me", headers=h(admin_token))
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]


# ============ Directories ============
def test_provinces():
    r = requests.get(f"{API}/provinces")
    assert r.status_code == 200
    data = r.json()
    codes = {p["code"] for p in data}
    assert {"CT", "AG", "VL", "DT", "TN", "CM"}.issubset(codes)


def test_machine_categories(admin_token):
    r = requests.get(f"{API}/machine-categories", headers=h(admin_token))
    assert r.status_code == 200
    codes = {c["code"] for c in r.json()}
    assert {"MC01", "MC02", "MC03", "MC04", "MC05"}.issubset(codes)


def test_htx_list(admin_token):
    r = requests.get(f"{API}/htx", headers=h(admin_token))
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) >= 24


def test_machines_list(admin_token):
    r = requests.get(f"{API}/machines", headers=h(admin_token))
    assert r.status_code == 200
    assert len(r.json()) >= 100


# ============ Map ============
def test_map_htx_summary(admin_token):
    r = requests.get(f"{API}/map/htx-summary", headers=h(admin_token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 24
    for row in data[:5]:
        assert "status_color" in row
        assert "coverage_ratio" in row


def test_htx_detail(admin_token):
    r = requests.get(f"{API}/map/htx/CT-HTX01/detail", headers=h(admin_token))
    assert r.status_code == 200
    j = r.json()
    assert "htx" in j and "by_category" in j and "machines" in j
    assert len(j["by_category"]) == 5


# ============ Dashboard ============
def test_dashboard_kpi(admin_token):
    r = requests.get(f"{API}/dashboard/kpi", headers=h(admin_token))
    assert r.status_code == 200
    d = r.json()
    for k in ("total_htx", "total_machines", "active_machines", "total_area_ha",
              "sufficient_htx", "shortage_slight_htx", "shortage_severe_htx"):
        assert k in d


def test_dashboard_charts(admin_token):
    r = requests.get(f"{API}/dashboard/charts", headers=h(admin_token))
    assert r.status_code == 200
    d = r.json()
    for k in ("by_category", "by_province", "hp_density", "status_distribution"):
        assert k in d and isinstance(d[k], list)
    assert len(d["by_province"]) == 6


def test_priority_list(admin_token):
    r = requests.get(f"{API}/dashboard/priority-list", headers=h(admin_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ============ Supply-Demand ============
def test_supply_demand(admin_token):
    r = requests.get(f"{API}/supply-demand", headers=h(admin_token))
    assert r.status_code == 200
    j = r.json()
    assert "rows" in j and "critical" in j
    # 6 provinces * 5 cats = 30
    assert len(j["rows"]) == 30


def test_supply_demand_filter(admin_token):
    r = requests.get(f"{API}/supply-demand?province=CT", headers=h(admin_token))
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert all(row["province_code"] == "CT" for row in rows)
    assert len(rows) == 5


# ============ HTX CRUD ============
def test_htx_create_update_delete(admin_token):
    code = "TEST-HTX99"
    # Cleanup first (may exist from prior run)
    requests.delete(f"{API}/htx/{code}", headers=h(admin_token))

    payload = {
        "code": code, "name": "TEST HTX", "owner_name": "TEST Owner",
        "owner_type": "HTX", "province_code": "CT", "district": "", "commune": "",
        "lat": 10.0, "lng": 105.7, "cultivated_area_ha": 100.0, "phone": "0900000000"
    }
    r = requests.post(f"{API}/htx", headers=h(admin_token), json=payload)
    assert r.status_code == 200, r.text

    # duplicate
    r2 = requests.post(f"{API}/htx", headers=h(admin_token), json=payload)
    assert r2.status_code == 400

    # update
    r3 = requests.patch(f"{API}/htx/{code}", headers=h(admin_token), json={"name": "TEST HTX Updated"})
    assert r3.status_code == 200

    # deactivate
    r4 = requests.delete(f"{API}/htx/{code}", headers=h(admin_token))
    assert r4.status_code == 200


def test_machine_create_duplicate(admin_token):
    payload = {
        "htx_id": "CT-HTX01", "category_code": "MC01",
        "serial_no": "TEST-DUP-SN-001", "horsepower": 50.0, "status": "hoat_dong"
    }
    r = requests.post(f"{API}/machines", headers=h(admin_token), json=payload)
    assert r.status_code == 200, r.text
    # duplicate
    r2 = requests.post(f"{API}/machines", headers=h(admin_token), json=payload)
    assert r2.status_code == 400
    # cleanup
    mid = r.json().get("id")
    if mid:
        requests.delete(f"{API}/machines/{mid}", headers=h(admin_token))


# ============ Reports ============
def test_reports_summary(admin_token):
    r = requests.get(f"{API}/reports/summary-by-region", headers=h(admin_token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 6


def test_reports_export_xlsx(admin_token):
    r = requests.get(f"{API}/reports/export?kind=summary_by_region&fmt=xlsx", headers=h(admin_token))
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers.get("content-type", "")
    assert len(r.content) > 100


def test_reports_export_pdf(admin_token):
    r = requests.get(f"{API}/reports/export?kind=supply_demand&fmt=pdf", headers=h(admin_token))
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:4] == b"%PDF"


def test_reports_export_htx_shortage(admin_token):
    r = requests.get(f"{API}/reports/export?kind=htx_shortage&fmt=xlsx", headers=h(admin_token))
    assert r.status_code == 200
    assert len(r.content) > 100


# ============ RBAC ============
def test_staff_forbidden_admin(staff_token):
    r1 = requests.get(f"{API}/admin/users", headers=h(staff_token))
    assert r1.status_code == 403

    r2 = requests.post(f"{API}/htx", headers=h(staff_token), json={
        "code": "X-FORBID", "name": "x", "owner_name": "x", "owner_type": "HTX",
        "province_code": "CT", "district": "", "commune": "",
        "lat": 10.0, "lng": 105.0, "cultivated_area_ha": 1, "phone": ""
    })
    assert r2.status_code == 403

    r3 = requests.post(f"{API}/machines", headers=h(staff_token), json={
        "htx_id": "CT-HTX01", "category_code": "MC01", "serial_no": "x", "horsepower": 1, "status": "hoat_dong"
    })
    assert r3.status_code == 403

    r4 = requests.post(f"{API}/machine-categories", headers=h(staff_token), json={
        "code": "MC99", "name": "x", "stage": "LAM_DAT"
    })
    assert r4.status_code == 403


# ============ Admin endpoints ============
def test_admin_users_list(admin_token):
    r = requests.get(f"{API}/admin/users", headers=h(admin_token))
    assert r.status_code == 200
    assert len(r.json()) >= 2


def test_admin_users_create_update(admin_token):
    email = "TEST_user@mekonggreen.vn"
    # cleanup by resetting
    r = requests.post(f"{API}/admin/users", headers=h(admin_token), json={
        "email": email, "full_name": "TEST", "role": "staff", "password": "pwd12345"
    })
    # If already exists, ok - patch it instead
    if r.status_code == 400:
        pass
    else:
        assert r.status_code == 200

    r2 = requests.patch(f"{API}/admin/users/{email}", headers=h(admin_token), json={"active": False})
    assert r2.status_code == 200


def test_admin_sync_logs(admin_token):
    r = requests.get(f"{API}/admin/sync-logs", headers=h(admin_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_sync_trigger(admin_token):
    r = requests.post(f"{API}/admin/sync-logs/trigger", headers=h(admin_token))
    assert r.status_code == 200
    assert "id" in r.json()


def test_admin_system_logs(admin_token):
    r = requests.get(f"{API}/admin/system-logs", headers=h(admin_token))
    assert r.status_code == 200


def test_admin_thresholds(admin_token):
    r = requests.get(f"{API}/admin/thresholds", headers=h(admin_token))
    assert r.status_code == 200
    r2 = requests.patch(f"{API}/admin/thresholds", headers=h(admin_token),
                        json={"sufficient_min": 0.95, "slight_min": 0.70})
    assert r2.status_code == 200


def test_productivity_norm_upsert(admin_token):
    r = requests.post(f"{API}/productivity-norms", headers=h(admin_token), json={
        "category_code": "MC01", "ha_per_machine_per_season": 60.0, "document_ref": "TEST"
    })
    assert r.status_code == 200
