// ตัวช่วยเรียก API ของ Worker (ส่ง cookie session ไปด้วยอัตโนมัติ)
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // session หมดอายุระหว่างใช้งาน -> กลับไปหน้า login
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    throw new ApiError(data.error || `เกิดข้อผิดพลาด (${res.status})`, res.status)
  }
  return data
}
