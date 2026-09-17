-- ตารางสินค้า (D1 / SQLite)
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sku        TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  category   TEXT    NOT NULL,
  price      REAL    NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO products (sku, name, category, price, stock) VALUES
  ('DR-001', 'กาแฟเย็น',              'เครื่องดื่ม',      45,  32),
  ('DR-002', 'ชาเขียวนม',             'เครื่องดื่ม',      40,   0),
  ('DR-003', 'น้ำดื่ม 600 มล.',        'เครื่องดื่ม',      10, 120),
  ('SN-001', 'มันฝรั่งทอด',           'ขนม',             25,   8),
  ('SN-002', 'คุกกี้ช็อกโกแลต',        'ขนม',             35,  54),
  ('ST-001', 'สมุดโน้ต A5',           'เครื่องเขียน',     29,  75),
  ('ST-002', 'ปากกาเจล 0.5',          'เครื่องเขียน',     15,   4),
  ('EL-001', 'สาย USB-C',             'อิเล็กทรอนิกส์',  159,  18),
  ('EL-002', 'หูฟังบลูทูธ',            'อิเล็กทรอนิกส์',  890,   6),
  ('EL-003', 'พาวเวอร์แบงก์ 10000mAh', 'อิเล็กทรอนิกส์',  590,   0);
