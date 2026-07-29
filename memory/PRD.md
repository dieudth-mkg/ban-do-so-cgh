# MekongGreen - Bản đồ số Cơ giới hóa Nông nghiệp ĐBSCL - PRD

## Problem statement
Hệ thống DCRD quản lý cơ giới hóa nông nghiệp 6 tỉnh ĐBSCL sau sáp nhập 2025: Cần Thơ, An Giang, Vĩnh Long, Đồng Tháp, Tây Ninh, Cà Mau. Cấp hành chính: tỉnh → xã (không còn cấp huyện).

## Personas
- Quản trị viên (admin): full CRUD, cấu hình, đồng bộ, import
- Cán bộ Cục DCRD (staff): read-only

## Core requirements
- FN-01 Bản đồ số Leaflet+OSM, ranh giới 6 tỉnh, heatmap HP/ha, gom cụm theo xã
- FN-02/03 Quản lý HTX & Máy, import Excel với validation
- FN-04 Cân đối Cung-Cầu theo mùa vụ
- FN-05 Báo cáo Excel/PDF có filter theo mùa vụ/tỉnh/chủng loại
- FN-06 Dashboard tổng quan
- FN-07 Xác thực JWT nội bộ
- FN-08 Danh mục, định mức, ngưỡng, cấu hình URL đồng bộ
- FN-09 Nhật ký hệ thống
- FN-10 Đồng bộ HTTP thực với Ứng dụng HTX

## Implemented (Feb 2026)
- Phase 1: 7 trang cơ bản, JWT, seed 24 HTX/1346 máy
- Phase 2: Excel HTX import, GeoJSON boundaries, heatmap HP/ha, season switcher
- Phase 3: Real HTX sync (httpx), commune drilldown + cluster, export with filters, machine bulk import

## Backlog
- P2: Bản đồ nhiệt mật độ (đã có gradient)
- P2: Multi-vụ tracking (đã có switcher)
- P2: Real-time đồng bộ (đang MOCK URL nội bộ, admin config sẵn sàng)
- P3: Notification email khi HTX rơi vào Thiếu nghiêm trọng
- P3: Máy chuyển HTX (transfer flow)
