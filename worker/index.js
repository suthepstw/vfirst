// Cloudflare Worker: API (D1) + เสิร์ฟหน้าเว็บ Vue จาก ./dist
//
//   POST /api/auth/login    เข้าสู่ระบบ { username, password }
//   POST /api/auth/logout   ออกจากระบบ
//   GET  /api/auth/me       ผู้ใช้ที่ login อยู่
//
//   ต้อง login ก่อน:
//   GET    /api/{products|addresses|investors}        รายการทั้งหมด
//   POST   /api/{products|addresses|investors}        เพิ่ม
//   PATCH  /api/{products|addresses|investors}/:id    แก้ไขบางฟิลด์
//   DELETE /api/{products|addresses|investors}/:id    ลบ
import { json } from './http.js'
import { login, logout, me, getUser } from './auth.js'
import { resources } from './resources.js'

const notAllowed = () => json({ error: 'Method not allowed' }, 405)

async function handleApi(request, env, pathname) {
  const method = request.method

  if (pathname === '/api/auth/login') return method === 'POST' ? login(request, env) : notAllowed()
  if (pathname === '/api/auth/logout') return method === 'POST' ? logout(request, env) : notAllowed()
  if (pathname === '/api/auth/me') return method === 'GET' ? me(request, env) : notAllowed()

  const m = pathname.match(/^\/api\/([a-z]+)(?:\/(\d+))?$/)
  const resource = m && Object.hasOwn(resources, m[1]) ? resources[m[1]] : null
  if (!resource) return json({ error: 'ไม่พบ API' }, 404)

  if (!(await getUser(request, env))) return json({ error: 'กรุณาเข้าสู่ระบบ' }, 401)

  const id = m[2] ? Number(m[2]) : null
  if (id === null) {
    if (method === 'GET') return resource.list(env)
    if (method === 'POST') return resource.create(request, env)
  } else {
    if (method === 'PATCH') return resource.update(request, env, id)
    if (method === 'DELETE') return resource.remove(env, id)
  }
  return notAllowed()
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, pathname)
      } catch (e) {
        console.error(e)
        return json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' }, 500)
      }
    }
    return env.ASSETS.fetch(request) // หน้าเว็บ Vue
  },
}
