# MekongGreen - Bản đồ số Cơ giới hóa Nông nghiệp ĐBSCL - PRD

## Problem statement
Xây dựng hệ thống cho Cục Kinh tế Hợp tác & Phát triển Nông thôn (DCRD) quản lý & giám sát cơ giới hóa nông nghiệp vùng ĐBSCL với 6 tỉnh (sau sáp nhập 2025): Cần Thơ, An Giang, Vĩnh Long, Đồng Tháp, Tây Ninh, Cà Mau.

## Personas
- **Quản trị viên (admin)**: đầy đủ quyền CRUD, cấu hình danh mục, quản lý tài khoản
- **Cán bộ Cục DCRD (staff)**: chỉ xem (read-only) - bản đồ, dashboard, cân đối, báo cáo

## Core requirements (static)
- FN-01: Bản đồ số Leaflet + OSM
- FN-02: Quản lý HTX & Chủ sở hữu
- FN-03: Quản lý Máy móc (định danh duy nhất QT-03)
- FN-04: Cân đối Cung-Cầu (QT-01, QT-02)
- FN-05: Báo cáo & Xuất Excel/PDF
- FN-06: Dashboard tổng quan
- FN-07: Xác thực (nội bộ, JWT, không có đăng ký)
- FN-08: Danh mục & Cấu hình (chủng loại, định mức, ngưỡng)
- FN-09: Nhật ký hệ thống
- FN-10: Đồng bộ API HTX App (MOCKED)

## Implemented (Feb 2026)
- Backend FastAPI + MongoDB (motor)
- JWT auth với bcrypt
- Seed data: 2 users, 6 provinces, 5 machine categories, 24 HTX, ~500+ máy
- Full 7 pages frontend (React + Leaflet + Recharts + Shadcn UI)
- Excel (openpyxl) + PDF (reportlab) export
- Mock sync logs

## Backlog / Next actions
- P1: Upload Excel danh bạ HTX (Frontend + Backend parser)
- P1: Thiết bị đồng bộ real-time API Ứng dụng HTX (thay thế mock)
- P2: Multi-season data tracking (Đông Xuân/Hè Thu/Thu Đông)
- P2: Vẽ ranh giới hành chính 6 tỉnh (GeoJSON overlay)
- P2: Bản đồ mật độ nhiệt (heatmap HP/ha)
