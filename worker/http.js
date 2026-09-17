// ตัวช่วยสำหรับตอบกลับ HTTP
export const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers })

export const noContent = () => new Response(null, { status: 204 })

export async function readJson(request) {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

export const badJson = () => json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, 400)
