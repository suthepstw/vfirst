// ระบบ login ด้วย session cookie (HttpOnly) เก็บ session ใน D1
import { json, noContent, readJson, badJson } from './http.js'
import { verifyPassword, sha256Hex } from './password.js'

const COOKIE = 'sid'
const SESSION_DAYS = 7
// แฮชหลอกไว้เทียบเมื่อไม่พบผู้ใช้ เพื่อให้เวลาตอบใกล้เคียงกัน (เดาไม่ได้ว่ามีชื่อผู้ใช้นี้หรือไม่)
const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

function sessionCookie(request, token, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

const publicUser = (u) => ({ id: u.id, username: u.username, display_name: u.display_name })

// คืนค่าผู้ใช้ที่ login อยู่ หรือ null
export async function getUser(request, env) {
  const token = getCookie(request, COOKIE)
  if (!token) return null
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.display_name
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')`
  ).bind(await sha256Hex(token)).first()
  return row ?? null
}

export async function login(request, env) {
  const body = await readJson(request)
  if (!body) return badJson()
  const username = String(body.username ?? '').trim()
  const password = String(body.password ?? '')
  if (!username || !password) return json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, 400)

  const user = await env.DB.prepare(
    'SELECT id, username, display_name, password_hash FROM users WHERE username = ?1'
  ).bind(username).first()
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)

  if (!user || !ok) {
    await new Promise((r) => setTimeout(r, 400)) // หน่วงเวลาเล็กน้อย กันการเดารหัสรัว ๆ
    return json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401)
  }

  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')"),
    env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES (?1, ?2, datetime('now', '+${SESSION_DAYS} days'))`
    ).bind(await sha256Hex(token), user.id),
  ])

  return json(publicUser(user), 200, {
    'Set-Cookie': sessionCookie(request, token, SESSION_DAYS * 86400),
  })
}

export async function logout(request, env) {
  const token = getCookie(request, COOKIE)
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256Hex(token)).run()
  }
  const res = noContent()
  res.headers.set('Set-Cookie', sessionCookie(request, '', 0))
  return res
}

export async function me(request, env) {
  const user = await getUser(request, env)
  return user ? json(publicUser(user)) : json({ error: 'ยังไม่ได้เข้าสู่ระบบ' }, 401)
}
