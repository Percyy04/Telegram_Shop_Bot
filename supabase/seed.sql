-- ================================================
-- seed.sql — Development seed data
-- ================================================
-- Run after migrations. DO NOT use in production.

-- Categories
INSERT INTO public.categories (name, slug, emoji, sort_order) VALUES
  ('AI & Productivity', 'ai-productivity', '🤖', 1),
  ('Design & Video', 'design-video', '🎬', 2),
  ('Developer Tools', 'developer-tools', '💻', 3),
  ('Entertainment', 'entertainment', '🎮', 4);

-- Products (6 placeholder products with generic names)
INSERT INTO public.products (
  category_id, sku, name, description, sale_price,
  warranty_text, delivery_note, min_quantity, max_quantity, low_stock_threshold
) VALUES
  (
    (SELECT id FROM categories WHERE slug = 'ai-productivity'),
    'AI-PRO-001', 'AI Assistant Pro 1 Tháng',
    'Tài khoản AI Assistant Pro sử dụng trong 1 tháng. Hỗ trợ tất cả tính năng premium.',
    125000, 'Bảo hành 30 ngày', 'Giao ngay qua Telegram sau khi thanh toán', 1, 5, 3
  ),
  (
    (SELECT id FROM categories WHERE slug = 'ai-productivity'),
    'AI-PRO-003', 'AI Writing Tool 3 Tháng',
    'Công cụ viết AI chuyên nghiệp, hỗ trợ tiếng Việt và tiếng Anh.',
    350000, 'Bảo hành 90 ngày', 'Giao ngay qua Telegram', 1, 3, 3
  ),
  (
    (SELECT id FROM categories WHERE slug = 'design-video'),
    'DV-EDIT-001', 'Video Editor Pro 7 Ngày',
    'Phần mềm chỉnh sửa video chuyên nghiệp, sử dụng 7 ngày.',
    25000, 'Không bảo hành', 'Giao ngay qua Telegram', 1, 10, 5
  ),
  (
    (SELECT id FROM categories WHERE slug = 'design-video'),
    'DV-EDIT-002', 'Video Editor Pro 1 Tháng',
    'Phần mềm chỉnh sửa video chuyên nghiệp, sử dụng 1 tháng.',
    80000, 'Bảo hành 7 ngày', 'Giao ngay qua Telegram', 1, 5, 3
  ),
  (
    (SELECT id FROM categories WHERE slug = 'developer-tools'),
    'DEV-IDE-001', 'Cloud IDE Pro 1 Tháng',
    'IDE trên đám mây với đầy đủ tính năng, hỗ trợ nhiều ngôn ngữ lập trình.',
    200000, 'Bảo hành 30 ngày', 'Giao ngay qua Telegram', 1, 2, 3
  ),
  (
    (SELECT id FROM categories WHERE slug = 'entertainment'),
    'ENT-MUSIC-001', 'Music Premium 1 Tháng',
    'Nghe nhạc không quảng cáo, chất lượng cao.',
    50000, 'Bảo hành 7 ngày', 'Giao ngay qua Telegram', 1, 5, 5
  );

-- NOTE: Stock units should be inserted via the admin dashboard 
-- with proper encryption. These placeholder entries use fake data
-- and should be replaced with encrypted payloads in a real setup.
-- To seed stock for testing, use the admin stock import feature
-- or run the scripts/seed.ts script.
