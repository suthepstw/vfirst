// ตั้ง/เปลี่ยนรหัสผ่านผู้ใช้ (สร้างผู้ใช้ใหม่ถ้ายังไม่มี) และบังคับ logout ทุกเครื่องของผู้ใช้นั้น
// ใช้: npm run user:set -- <username> <password> [--remote] [--name ชื่อที่แสดง]
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from '../worker/password.js'

const positional = []
let remote = false
let displayName = null
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--remote') remote = true
  else if (argv[i] === '--name') displayName = argv[++i]
  else positional.push(argv[i])
}
const [username, password] = positional

if (!username || !password) {
  console.error('ใช้: npm run user:set -- <username> <password> [--remote] [--name ชื่อที่แสดง]')
  process.exit(1)
}
if (password.length < 8) {
  console.error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
  process.exit(1)
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const hash = await hashPassword(password)
const sql = `INSERT INTO users (username, password_hash, display_name)
VALUES (${q(username)}, ${q(hash)}, ${q(displayName || username)})
ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash${
  displayName ? ', display_name = excluded.display_name' : ''
};
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ${q(username)});
`

const file = join(tmpdir(), `vfirst-user-${Date.now()}.sql`)
writeFileSync(file, sql)
try {
  execSync(`npx wrangler d1 execute vfirst-db ${remote ? '--remote' : '--local'} --file="${file}"`, {
    stdio: 'inherit',
  })
  console.log(`\n✓ ตั้งรหัสผ่านของ "${username}" แล้ว (${remote ? 'บน Cloudflare' : 'ในเครื่อง'})`)
} finally {
  unlinkSync(file)
}
