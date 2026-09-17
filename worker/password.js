// แฮชรหัสผ่านด้วย PBKDF2-SHA256 (Web Crypto — ใช้ได้ทั้งใน Worker และ Node 20+)
// รูปแบบที่เก็บ: pbkdf2$<iterations>$<salt base64>$<hash base64>
const ITERATIONS = 100000 // Cloudflare Workers รองรับสูงสุด 100,000
const enc = new TextEncoder()

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(bits)}`
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, saltB64, hashB64] = String(stored).split('$')
  if (scheme !== 'pbkdf2') return false
  const actual = new Uint8Array(await derive(password, fromB64(saltB64), Number(iter)))
  const expected = fromB64(hashB64)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i] // เทียบแบบเวลาคงที่
  return diff === 0
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
