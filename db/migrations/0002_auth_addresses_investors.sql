-- เพิ่มระบบ login + ตารางที่อยู่ + ผู้ร่วมทุน (ข้อมูลสินค้าเดิมไม่หาย)
-- ผู้ใช้ระบบ (รหัสผ่านเก็บแบบ PBKDF2-SHA256 ไม่เก็บรหัสจริง)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  display_name  TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- session ที่ login อยู่ (เก็บ SHA-256 ของ token ไม่เก็บ token จริง)
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ที่อยู่ (ติดต่อ / สาขา / จัดส่ง)
CREATE TABLE IF NOT EXISTS addresses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,
  contact     TEXT,
  phone       TEXT,
  line1       TEXT NOT NULL,
  subdistrict TEXT,
  district    TEXT,
  province    TEXT NOT NULL,
  postcode    TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ผู้ร่วมทุน
CREATE TABLE IF NOT EXISTS investors (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  amount        REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
  share_percent REAL NOT NULL DEFAULT 0 CHECK (share_percent >= 0 AND share_percent <= 100),
  joined_on     TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ผู้ใช้เริ่มต้น: admin / admin1234  (เปลี่ยนรหัสด้วย npm run user:set -- admin <รหัสใหม่> --remote)
INSERT OR IGNORE INTO users (username, password_hash, display_name)
VALUES ('admin', 'pbkdf2$100000$i+56kxC1fdYXg0+Q0fG8eg==$PzFwKxLBV7JVJvmwDFo2+8yO4K/AgGUpQWnJP3wgPCc=', 'ผู้ดูแลระบบ');

INSERT INTO addresses (label, contact, phone, line1, subdistrict, district, province, postcode, note) VALUES
  ('สำนักงานใหญ่', 'คุณสมชาย ใจดี', '075-123-456', '99 ถ.พระรามหก', 'ทับเที่ยง', 'เมืองตรัง', 'ตรัง', '92000', 'เปิด จ.-ศ. 8:30-17:00'),
  ('คลังสินค้า', 'คุณวิภา แสงทอง', '081-234-5678', '12/3 หมู่ 4', 'โคกหล่อ', 'เมืองตรัง', 'ตรัง', '92000', NULL),
  ('สาขาหาดใหญ่', 'คุณอนันต์ ทองดี', '074-555-010', '45 ถ.นิพัทธ์อุทิศ 3', 'หาดใหญ่', 'หาดใหญ่', 'สงขลา', '90110', NULL);

INSERT INTO investors (name, email, phone, amount, share_percent, joined_on, note) VALUES
  ('คุณสมชาย ใจดี', 'somchai@example.com', '081-111-1111', 500000, 40, '2025-01-15', 'ผู้ก่อตั้ง'),
  ('คุณวิภา แสงทอง', 'wipa@example.com', '082-222-2222', 300000, 25, '2025-03-01', NULL),
  ('บริษัท ตรังพัฒนา จำกัด', 'contact@trangdev.example', '075-999-000', 250000, 20, '2025-06-10', 'นิติบุคคล'),
  ('คุณอนันต์ ทองดี', 'anan@example.com', '083-333-3333', 150000, 15, '2026-01-05', NULL);
