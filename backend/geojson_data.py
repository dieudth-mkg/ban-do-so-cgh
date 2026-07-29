"""Hand-crafted approximate polygon boundaries for 6 ĐBSCL provinces (post-2025 merger).
Coordinates are approximated for visualization; not for official mapping.
GeoJSON format: [lng, lat] order per spec.
"""

PROVINCE_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"code": "CT", "name": "Cần Thơ"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.45, 9.85], [105.55, 9.80], [105.75, 9.85],
                    [105.95, 9.95], [106.05, 10.10], [106.00, 10.25],
                    [105.85, 10.30], [105.65, 10.28], [105.50, 10.15],
                    [105.42, 10.00], [105.45, 9.85]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"code": "AG", "name": "An Giang"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [104.75, 10.25], [104.85, 10.20], [105.05, 10.25],
                    [105.30, 10.40], [105.40, 10.60], [105.35, 10.80],
                    [105.15, 10.90], [104.95, 10.85], [104.80, 10.65],
                    [104.72, 10.45], [104.75, 10.25]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"code": "VL", "name": "Vĩnh Long"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.78, 9.98], [105.90, 9.95], [106.10, 10.05],
                    [106.30, 10.20], [106.35, 10.35], [106.20, 10.42],
                    [106.00, 10.38], [105.85, 10.25], [105.75, 10.10],
                    [105.78, 9.98]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"code": "DT", "name": "Đồng Tháp"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.30, 10.20], [105.45, 10.15], [105.65, 10.25],
                    [105.85, 10.45], [105.95, 10.65], [105.85, 10.85],
                    [105.65, 10.95], [105.45, 10.85], [105.30, 10.65],
                    [105.22, 10.45], [105.30, 10.20]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"code": "TN", "name": "Tây Ninh"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [105.85, 10.85], [106.00, 10.80], [106.20, 10.90],
                    [106.40, 11.10], [106.50, 11.35], [106.45, 11.60],
                    [106.30, 11.70], [106.10, 11.65], [105.95, 11.45],
                    [105.85, 11.20], [105.80, 11.00], [105.85, 10.85]
                ]]
            }
        },
        {
            "type": "Feature",
            "properties": {"code": "CM", "name": "Cà Mau"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [104.75, 8.55], [104.85, 8.45], [105.05, 8.50],
                    [105.30, 8.70], [105.50, 8.95], [105.55, 9.20],
                    [105.45, 9.45], [105.25, 9.55], [105.00, 9.50],
                    [104.80, 9.30], [104.70, 9.05], [104.65, 8.80],
                    [104.75, 8.55]
                ]]
            }
        },
    ]
}
