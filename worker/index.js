// Cloudflare Worker: API /api/products (D1) + เสิร์ฟไฟล์ Vue จาก ./dist
//   GET    /api/products       รายการสินค้าทั้งหมด
//   POST   /api/products       เพิ่มสินค้า
//   PATCH  /api/products/:id   แก้ไขบางฟิลด์ (เช่น stock)
//   DELETE /api/products/:id   ลบสินค้า
const json = (data, status = 200) => Response.json(data, { status })
const COLS = 'id, sku, name, category, price, stock, image_url'
const EDITABLE = ['name', 'category', 'price', 'stock', 'image_url']

// ลิงก์รูป: ว่างได้ (null) หรือต้องขึ้นต้นด้วย http:// / https://
function cleanImageUrl(value) {
  const url = String(value ?? '').trim()
  if (!url) return { ok: true, value: null }
  try {
    const u = new URL(url)
    if (u.protocol === 'http:' || u.protocol === 'https:') return { ok: true, value: u.href }
  } catch {}
  return { ok: false }
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function listProducts(env) {
  const { results } = await env.DB.prepare(`SELECT ${COLS} FROM products ORDER BY id`).all()
  return json(results)
}

async function createProduct(request, env) {
  const body = await readJson(request)
  if (!body) return json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400)

  const sku = String(body.sku ?? '').trim().toUpperCase()
  const name = String(body.name ?? '').trim()
  const category = String(body.category ?? '').trim()
  const price = Number(body.price)
  const stock = Number(body.stock)
  const image = cleanImageUrl(body.image_url)

  if (!sku || !name || !category) return json({ error: 'กรุณากรอกรหัส ชื่อ และหมวดหมู่' }, 400)
  if (!(price >= 0) || !Number.isInteger(stock) || stock < 0)
    return json({ error: 'ราคาและจำนวนต้องเป็นตัวเลขไม่ติดลบ' }, 400)
  if (!image.ok) return json({ error: 'ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://' }, 400)

  try {
    const row = await env.DB.prepare(
      `INSERT INTO products (sku, name, category, price, stock, image_url)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING ${COLS}`
    ).bind(sku, name, category, price, stock, image.value).first()
    return json(row, 201)
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return json({ error: `รหัส ${sku} มีอยู่แล้ว` }, 409)
    throw e
  }
}

async function updateProduct(request, env, id) {
  const body = await readJson(request)
  if (!body) return json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400)

  const fields = EDITABLE.filter((k) => k in body)
  if (fields.length === 0) return json({ error: 'ไม่มีข้อมูลที่จะแก้ไข' }, 400)
  if ('stock' in body && !(Number.isInteger(body.stock) && body.stock >= 0))
    return json({ error: 'จำนวนต้องเป็นจำนวนเต็มไม่ติดลบ' }, 400)
  if ('price' in body && !(Number(body.price) >= 0)) return json({ error: 'ราคาต้องไม่ติดลบ' }, 400)
  if ('image_url' in body) {
    const image = cleanImageUrl(body.image_url)
    if (!image.ok) return json({ error: 'ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://' }, 400)
    body.image_url = image.value
  }

  const sets = fields.map((k, i) => `${k} = ?${i + 1}`).join(', ')
  const row = await env.DB.prepare(
    `UPDATE products SET ${sets} WHERE id = ?${fields.length + 1} RETURNING ${COLS}`
  ).bind(...fields.map((k) => body[k]), id).first()
  return row ? json(row) : json({ error: 'ไม่พบสินค้า' }, 404)
}

async function deleteProduct(env, id) {
  const { meta } = await env.DB.prepare('DELETE FROM products WHERE id = ?1').bind(id).run()
  return meta.changes ? new Response(null, { status: 204 }) : json({ error: 'ไม่พบสินค้า' }, 404)
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    const method = request.method

    if (pathname === '/api/products') {
      if (method === 'GET') return listProducts(env)
      if (method === 'POST') return createProduct(request, env)
      return json({ error: 'Method not allowed' }, 405)
    }

    const m = pathname.match(/^\/api\/products\/(\d+)$/)
    if (m) {
      const id = Number(m[1])
      if (method === 'PATCH') return updateProduct(request, env, id)
      if (method === 'DELETE') return deleteProduct(env, id)
      return json({ error: 'Method not allowed' }, 405)
    }

    if (pathname.startsWith('/api/')) return json({ error: 'ไม่พบ API' }, 404)

    // อย่างอื่นเป็นไฟล์หน้าเว็บ Vue
    return env.ASSETS.fetch(request)
  },
}
