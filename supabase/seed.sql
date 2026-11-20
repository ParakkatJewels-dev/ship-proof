-- ==============================================================================
-- ShipProof: Seed Data for Local Development
-- ==============================================================================

-- 1. Insert Packing Stations
INSERT INTO stations (id, station_code, name, location, status, camera_status, api_key_hash, camera_info)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'STATION-01', 'Packing Bay 1 (Main Hall)', 'Bengaluru Warehouse', 'ONLINE', 'CONNECTED', 'station_key_hash_01', '{"deviceIndex": 0, "name": "Logitech C920 Pro HD", "resolution": "1080p", "fps": 30}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'STATION-02', 'Packing Bay 2 (Express)', 'Bengaluru Warehouse', 'ONLINE', 'CONNECTED', 'station_key_hash_02', '{"deviceIndex": 1, "name": "Hikvision 1080p RTSP", "resolution": "1080p", "fps": 30, "rtspUrl": "rtsp://192.168.1.120:554/stream1"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'STATION-03', 'Packing Bay 3 (High Value)', 'Kochi Showroom', 'OFFLINE', 'DISCONNECTED', 'station_key_hash_03', '{"deviceIndex": 0, "name": "USB Desk Cam 4K", "resolution": "4K", "fps": 60}'::jsonb)
ON CONFLICT (station_code) DO NOTHING;

-- 2. Insert Sample Orders
INSERT INTO orders (id, shopify_order_id, order_number, customer_name, customer_email, currency, total_price, items, fulfillment_status, delivery_status, delivered_at)
VALUES
  (
    '44444444-4444-4444-4444-444444444444',
    'gid://shopify/Order/5892301923',
    '#1042',
    'Rohan Sharma',
    'rohan.sharma@example.com',
    'INR',
    4999.00,
    '[
      {"id": "item-1", "sku": "PJ-GLD-RNG-01", "title": "22K Gold Filigree Ring", "variantTitle": "Size 14", "quantity": 1, "price": "3499.00", "imageUrl": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300"},
      {"id": "item-2", "sku": "PJ-SIL-CHN-05", "title": "Sterling Silver Box Chain", "variantTitle": "18 Inch", "quantity": 1, "price": "1500.00", "imageUrl": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300"}
    ]'::jsonb,
    'fulfilled',
    'DELIVERED',
    NOW() - INTERVAL '3 days'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'gid://shopify/Order/5892301924',
    '#1043',
    'Ananya Nair',
    'ananya.nair@example.com',
    'INR',
    8450.00,
    '[
      {"id": "item-3", "sku": "PJ-DMD-PND-09", "title": "Solitaire Diamond Pendant", "variantTitle": "White Gold", "quantity": 1, "price": "8450.00", "imageUrl": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300"}
    ]'::jsonb,
    'unfulfilled',
    'PENDING',
    NULL
  )
ON CONFLICT (shopify_order_id) DO NOTHING;
