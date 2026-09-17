// สร้าง API แบบ CRUD ให้ตาราง D1 จากคำอธิบายฟิลด์
//   fields: { ชื่อคอลัมน์: { type: 'text'|'number'|'email'|'date'|'url', required, min, max, maxLength, label } }
import { json, noContent, readJson, badJson } from './http.js'

function cleanValue(key, spec, raw) {
  const label = spec.label || key
  const empty = raw === undefined || raw === null || String(raw).trim() === ''

  if (empty) {
    if (spec.required) return { error: `กรุณากรอก${label}` }
    return { value: spec.type === 'number' ? (spec.default ?? 0) : null }
  }

  if (spec.type === 'number') {
    const n = Number(raw)
    if (!Number.isFinite(n)) return { error: `${label}ต้องเป็นตัวเลข` }
    if (spec.integer && !Number.isInteger(n)) return { error: `${label}ต้องเป็นจำนวนเต็ม` }
    if (spec.min !== undefined && n < spec.min) return { error: `${label}ต้องไม่น้อยกว่า ${spec.min}` }
    if (spec.max !== undefined && n > spec.max) return { error: `${label}ต้องไม่เกิน ${spec.max}` }
    return { value: n }
  }

  const s = String(raw).trim()
  if (s.length > (spec.maxLength ?? 500)) return { error: `${label}ยาวเกินไป` }
  if (spec.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    return { error: `${label}ไม่ถูกต้อง` }
  if (spec.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s))
    return { error: `${label}ต้องอยู่ในรูปแบบ ปปปป-ดด-วว` }
  if (spec.type === 'url') {
    try {
      const u = new URL(s)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw 0
      return { value: u.href }
    } catch {
      return { error: `${label}ต้องขึ้นต้นด้วย http:// หรือ https://` }
    }
  }
  return { value: spec.upper ? s.toUpperCase() : s }
}

// partial = true สำหรับ PATCH (ตรวจเฉพาะฟิลด์ที่ส่งมา)
function validate(fields, body, partial) {
  const out = {}
  for (const [key, spec] of Object.entries(fields)) {
    if (spec.readonly && partial) continue
    if (partial && !(key in body)) continue
    const r = cleanValue(key, spec, body[key])
    if (r.error) return { error: r.error }
    out[key] = r.value
  }
  return { data: out }
}

export function makeCrud(table, fields, { orderBy = 'id', uniqueMessage } = {}) {
  const cols = ['id', ...Object.keys(fields)].join(', ')

  const onError = (e) => {
    const msg = String(e.message)
    if (msg.includes('UNIQUE')) return json({ error: uniqueMessage || 'ข้อมูลซ้ำกับที่มีอยู่แล้ว' }, 409)
    if (msg.includes('CHECK')) return json({ error: 'ข้อมูลไม่อยู่ในช่วงที่กำหนด' }, 400)
    throw e
  }

  return {
    async list(env) {
      const { results } = await env.DB.prepare(`SELECT ${cols} FROM ${table} ORDER BY ${orderBy}`).all()
      return json(results)
    },

    async create(request, env) {
      const body = await readJson(request)
      if (!body) return badJson()
      const { data, error } = validate(fields, body, false)
      if (error) return json({ error }, 400)
      const keys = Object.keys(data)
      try {
        const row = await env.DB.prepare(
          `INSERT INTO ${table} (${keys.join(', ')})
           VALUES (${keys.map((_, i) => `?${i + 1}`).join(', ')}) RETURNING ${cols}`
        ).bind(...keys.map((k) => data[k])).first()
        return json(row, 201)
      } catch (e) {
        return onError(e)
      }
    },

    async update(request, env, id) {
      const body = await readJson(request)
      if (!body) return badJson()
      const { data, error } = validate(fields, body, true)
      if (error) return json({ error }, 400)
      const keys = Object.keys(data)
      if (keys.length === 0) return json({ error: 'ไม่มีข้อมูลที่จะแก้ไข' }, 400)
      try {
        const row = await env.DB.prepare(
          `UPDATE ${table} SET ${keys.map((k, i) => `${k} = ?${i + 1}`).join(', ')}
           WHERE id = ?${keys.length + 1} RETURNING ${cols}`
        ).bind(...keys.map((k) => data[k]), id).first()
        return row ? json(row) : json({ error: 'ไม่พบข้อมูล' }, 404)
      } catch (e) {
        return onError(e)
      }
    },

    async remove(env, id) {
      const { meta } = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run()
      return meta.changes ? noContent() : json({ error: 'ไม่พบข้อมูล' }, 404)
    },
  }
}
