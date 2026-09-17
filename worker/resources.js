// ตารางข้อมูลที่เปิดเป็น API: /api/<ชื่อ> และ /api/<ชื่อ>/:id  (ต้อง login ก่อน)
import { makeCrud } from './crud.js'

export const resources = {
  products: makeCrud(
    'products',
    {
      sku: { type: 'text', required: true, maxLength: 30, label: 'รหัสสินค้า', readonly: true, upper: true },
      name: { type: 'text', required: true, maxLength: 200, label: 'ชื่อสินค้า' },
      category: { type: 'text', required: true, maxLength: 50, label: 'หมวดหมู่' },
      price: { type: 'number', min: 0, label: 'ราคา' },
      stock: { type: 'number', min: 0, integer: true, label: 'จำนวน' },
      image_url: { type: 'url', maxLength: 2000, label: 'ลิงก์รูป' },
    },
    { uniqueMessage: 'รหัสสินค้านี้มีอยู่แล้ว' }
  ),

  addresses: makeCrud('addresses', {
    label: { type: 'text', required: true, maxLength: 100, label: 'ชื่อสถานที่' },
    contact: { type: 'text', maxLength: 100, label: 'ผู้ติดต่อ' },
    phone: { type: 'text', maxLength: 30, label: 'เบอร์โทร' },
    line1: { type: 'text', required: true, maxLength: 300, label: 'ที่อยู่' },
    subdistrict: { type: 'text', maxLength: 100, label: 'ตำบล/แขวง' },
    district: { type: 'text', maxLength: 100, label: 'อำเภอ/เขต' },
    province: { type: 'text', required: true, maxLength: 100, label: 'จังหวัด' },
    postcode: { type: 'text', maxLength: 10, label: 'รหัสไปรษณีย์' },
    note: { type: 'text', maxLength: 500, label: 'หมายเหตุ' },
  }),

  investors: makeCrud(
    'investors',
    {
      name: { type: 'text', required: true, maxLength: 200, label: 'ชื่อผู้ร่วมทุน' },
      email: { type: 'email', maxLength: 200, label: 'อีเมล' },
      phone: { type: 'text', maxLength: 30, label: 'เบอร์โทร' },
      amount: { type: 'number', min: 0, label: 'เงินลงทุน' },
      share_percent: { type: 'number', min: 0, max: 100, label: 'สัดส่วนหุ้น' },
      joined_on: { type: 'date', label: 'วันที่ร่วมทุน' },
      note: { type: 'text', maxLength: 500, label: 'หมายเหตุ' },
    },
    { orderBy: 'amount DESC, id' }
  ),
}
