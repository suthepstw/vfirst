// PATCH  /api/products/:id  -> แก้ไขบางฟิลด์ (เช่น stock)
// DELETE /api/products/:id  -> ลบสินค้า
const json = (data, status = 200) => Response.json(data, { status })
const EDITABLE = ['name', 'category', 'price', 'stock']

export async function onRequestPatch({ request, env, params }) {
  const id = Number(params.id)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400)
  }

  const fields = EDITABLE.filter((k) => k in body)
  if (fields.length === 0) return json({ error: 'ไม่มีข้อมูลที่จะแก้ไข' }, 400)
  if ('stock' in body && !(Number.isInteger(body.stock) && body.stock >= 0))
    return json({ error: 'จำนวนต้องเป็นจำนวนเต็มไม่ติดลบ' }, 400)
  if ('price' in body && !(Number(body.price) >= 0))
    return json({ error: 'ราคาต้องไม่ติดลบ' }, 400)

  const sets = fields.map((k, i) => `${k} = ?${i + 1}`).join(', ')
  const row = await env.DB.prepare(
    `UPDATE products SET ${sets} WHERE id = ?${fields.length + 1}
     RETURNING id, sku, name, category, price, stock`
  ).bind(...fields.map((k) => body[k]), id).first()

  return row ? json(row) : json({ error: 'ไม่พบสินค้า' }, 404)
}

export async function onRequestDelete({ env, params }) {
  const { meta } = await env.DB.prepare('DELETE FROM products WHERE id = ?1')
    .bind(Number(params.id)).run()
  return meta.changes ? new Response(null, { status: 204 }) : json({ error: 'ไม่พบสินค้า' }, 404)
}
