-- เพิ่มคอลัมน์ลิงก์รูปสินค้าให้ตารางเดิม (ข้อมูลเดิมไม่หาย)
ALTER TABLE products ADD COLUMN image_url TEXT;
