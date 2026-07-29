"""Phase 2 backend tests - GeoJSON, Heatmap, Excel Import, Season Switcher."""
import os
import io
import pytest
import requests
from openpyxl import Workbook

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@mekonggreen.vn", "password": "admin123"}
STAFF = {"email": "canbo@dcrd.gov.vn", "password": "canbo123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def staff_token():
    r = requests.post(f"{API}/auth/login", json=STAFF, timeout=30)
    assert r.status_code == 200
    return r.json()["token"]


def h(t):
    return {"Authorization": f"Bearer {t}"}


# ============ GeoJSON provinces ============
def test_geojson_provinces():
    r = requests.get(f"{API}/geojson/provinces", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "FeatureCollection"
    codes = {f["properties"]["code"] for f in d["features"]}
    assert codes == {"CT", "AG", "VL", "DT", "TN", "CM"}
    for f in d["features"]:
        assert f["geometry"]["type"] == "Polygon"
        coords = f["geometry"]["coordinates"][0]
        assert len(coords) >= 4


# ============ Heatmap ============
def test_map_heatmap(admin_token):
    r = requests.get(f"{API}/map/heatmap", headers=h(admin_token))
    assert r.status_code == 200
    d = r.json()
    assert "points" in d and "max_density" in d
    assert isinstance(d["points"], list) and len(d["points"]) > 0
    p = d["points"][0]
    for k in ("lat", "lng", "hp_per_ha", "htx_code"):
        assert k in p
    assert isinstance(d["max_density"], (int, float))


# ============ Import template ============
def test_import_template_admin(admin_token):
    r = requests.get(f"{API}/htx/import-template", headers=h(admin_token))
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers.get("content-type", "")
    assert r.content[:2] == b"PK"  # xlsx magic


def test_import_template_staff_forbidden(staff_token):
    r = requests.get(f"{API}/htx/import-template", headers=h(staff_token))
    assert r.status_code == 403


# ============ Helpers to build workbook ============
def _wb_bytes(rows):
    wb = Workbook()
    ws = wb.active
    for r in rows:
        ws.append(r)
    bio = io.BytesIO()
    wb.save(bio)
    return bio.getvalue()


HEADER = ["code", "name", "owner_name", "province_code", "district", "commune",
          "lat", "lng", "cultivated_area_ha", "phone"]


# ============ Import Excel ============
def test_import_excel_dry_run_ok(admin_token):
    data = _wb_bytes([
        HEADER,
        ["TEST-P2-01", "HTX P2 One", "Owner A", "CT", "D", "C", 10.05, 105.65, 500, "0900"],
        ["TEST-P2-02", "HTX P2 Two", "Owner B", "AG", "D", "C", 10.55, 105.15, 700, "0901"],
    ])
    files = {"file": ("test.xlsx", data,
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel?dry_run=true", headers=h(admin_token), files=files)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["dry_run"] is True
    assert j["ok_count"] == 2
    assert j["error_count"] == 0
    assert j["inserted"] == 0

    # Verify not in DB
    r2 = requests.get(f"{API}/htx", headers=h(admin_token))
    codes = {x["code"] for x in r2.json()}
    assert "TEST-P2-01" not in codes


def test_import_excel_invalid_province(admin_token):
    data = _wb_bytes([HEADER,
        ["TEST-P2-BAD", "HTX X", "Owner", "ZZ", "", "", 10.0, 105.5, 100, "0900"]])
    files = {"file": ("bad.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel?dry_run=true", headers=h(admin_token), files=files)
    assert r.status_code == 200
    j = r.json()
    assert j["error_count"] == 1
    errs = j["errors"][0]["errors"]
    assert any("province_code không hợp lệ" in e for e in errs)


def test_import_excel_missing_required(admin_token):
    data = _wb_bytes([HEADER,
        ["TEST-P2-MISS", "", "", "CT", "", "", 10.0, 105.5, 100, ""]])
    files = {"file": ("miss.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel?dry_run=true", headers=h(admin_token), files=files)
    assert r.status_code == 200
    j = r.json()
    assert j["error_count"] == 1
    errs = j["errors"][0]["errors"]
    assert any("name" in e for e in errs)
    assert any("owner_name" in e for e in errs)


def test_import_excel_bad_latlng(admin_token):
    data = _wb_bytes([HEADER,
        ["TEST-P2-LL", "N", "O", "CT", "", "", "abc", "xyz", 100, ""]])
    files = {"file": ("ll.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel?dry_run=true", headers=h(admin_token), files=files)
    assert r.status_code == 200
    errs = r.json()["errors"][0]["errors"]
    assert any("lat/lng phải là số" in e for e in errs)


def test_import_excel_existing_skipped(admin_token):
    # CT-HTX01 exists from seed
    data = _wb_bytes([HEADER,
        ["CT-HTX01", "Dup", "O", "CT", "", "", 10.0, 105.5, 100, ""]])
    files = {"file": ("dup.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel?dry_run=true", headers=h(admin_token), files=files)
    assert r.status_code == 200
    j = r.json()
    assert j["skipped_count"] == 1


def test_import_excel_actual_insert_and_cleanup(admin_token):
    # Cleanup any prior
    for c in ("TEST-P2-INS1", "TEST-P2-INS2"):
        requests.delete(f"{API}/htx/{c}", headers=h(admin_token))

    r0 = requests.get(f"{API}/htx", headers=h(admin_token))
    before = len(r0.json())

    data = _wb_bytes([
        HEADER,
        ["TEST-P2-INS1", "Ins One", "Owner A", "CT", "D", "C", 10.05, 105.65, 500, "0900"],
        ["TEST-P2-INS2", "Ins Two", "Owner B", "VL", "D", "C", 10.25, 106.05, 400, "0901"],
    ])
    files = {"file": ("ins.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel?dry_run=false", headers=h(admin_token), files=files)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["inserted"] == 2

    r2 = requests.get(f"{API}/htx", headers=h(admin_token))
    codes = {x["code"] for x in r2.json()}
    assert "TEST-P2-INS1" in codes and "TEST-P2-INS2" in codes
    assert len(r2.json()) >= before + 2

    # Cleanup (deactivate)
    for c in ("TEST-P2-INS1", "TEST-P2-INS2"):
        requests.delete(f"{API}/htx/{c}", headers=h(admin_token))


def test_import_excel_non_xlsx(admin_token):
    files = {"file": ("bad.csv", b"a,b,c\n1,2,3\n", "text/csv")}
    r = requests.post(f"{API}/htx/import-excel", headers=h(admin_token), files=files)
    assert r.status_code == 400


def test_import_excel_staff_forbidden(staff_token):
    data = _wb_bytes([HEADER, ["X", "n", "o", "CT", "", "", 10, 105, 1, ""]])
    files = {"file": ("x.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = requests.post(f"{API}/htx/import-excel", headers=h(staff_token), files=files)
    assert r.status_code == 403


# ============ Season switcher ============
def test_supply_demand_seasons_differ(admin_token):
    r_dx = requests.get(f"{API}/supply-demand?season=DX", headers=h(admin_token)).json()
    r_ht = requests.get(f"{API}/supply-demand?season=HT", headers=h(admin_token)).json()
    r_td = requests.get(f"{API}/supply-demand?season=TD", headers=h(admin_token)).json()

    # Need value should scale with factor: DX=1.0 > HT=0.9 > TD=0.6
    # Pick a stable row
    def pick(rows, prov, cat):
        for x in rows:
            if x["province_code"] == prov and x["category_code"] == cat:
                return x
        return None

    dx = pick(r_dx["rows"], "CT", "MC01")
    ht = pick(r_ht["rows"], "CT", "MC01")
    td = pick(r_td["rows"], "CT", "MC01")
    assert dx and ht and td
    assert dx["needed"] > ht["needed"] > td["needed"]


def test_supply_demand_td_fewer_critical(admin_token):
    r_dx = requests.get(f"{API}/supply-demand?season=DX", headers=h(admin_token)).json()
    r_td = requests.get(f"{API}/supply-demand?season=TD", headers=h(admin_token)).json()
    # TD has lower demand so fewer or equal critical (severe) rows
    n_dx = sum(1 for r in r_dx["rows"] if r["status"] == "severe")
    n_td = sum(1 for r in r_td["rows"] if r["status"] == "severe")
    assert n_td <= n_dx


def test_map_summary_seasons_differ(admin_token):
    r_dx = requests.get(f"{API}/map/htx-summary?season=DX", headers=h(admin_token)).json()
    r_td = requests.get(f"{API}/map/htx-summary?season=TD", headers=h(admin_token)).json()
    # Match by code
    dx_map = {r["code"]: r.get("coverage_ratio") for r in r_dx}
    td_map = {r["code"]: r.get("coverage_ratio") for r in r_td}
    # For at least one HTX with defined ratio, TD ratio should be higher (less demand)
    diffs = 0
    for code, dx_r in dx_map.items():
        td_r = td_map.get(code)
        if dx_r is not None and td_r is not None and td_r > dx_r:
            diffs += 1
    assert diffs >= 1
