// GET  /api/products  -> รายการสินค้าทั้งหมด
// POST /api/products  -> เพิ่มสินค้าใหม่
const json = (data, status = 200) => Response.json(data, { status })

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, sku, name, category, price, stock FROM products ORDER BY id'
  ).all()
  return json(results)
}

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400)
  }
  const sku = String(body.sku ?? '').trim().toUpperCase()
  const name = String(body.name ?? '').trim()
  const category = String(body.category ?? '').trim()
  const price = Number(body.price)
  const stock = Number(body.stock)

  if (!sku || !name || !category) return json({ error: 'กรุณากรอกรหัส ชื่อ และหมวดหมู่' }, 400)
  if (!(price >= 0) || !Number.isInteger(stock) || stock < 0)
    return json({ error: 'ราคาและจำนวนต้องเป็นตัวเลขไม่ติดลบ' }, 400)

  try {
    const row = await env.DB.prepare(
      `INSERT INTO products (sku, name, category, price, stock)
       VALUES (?1, ?2, ?3, ?4, ?5)
       RETURNING id, sku, name, category, price, stock`
    ).bind(sku, name, category, price, stock).first()
    return json(row, 201)
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return json({ error: `รหัส ${sku} มีอยู่แล้ว` }, 409)
    throw e
  }
}
