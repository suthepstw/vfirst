// สถานะการเข้าสู่ระบบ (ใช้ร่วมกันทั้งแอป)
import { ref } from 'vue'
import { api, setUnauthorizedHandler } from './api.js'

export const user = ref(null)
export const checking = ref(true)
export const sessionExpired = ref(false)

setUnauthorizedHandler(() => {
  if (user.value) sessionExpired.value = true
  user.value = null
})

export async function checkSession() {
  checking.value = true
  try {
    user.value = await api('/auth/me')
  } catch {
    user.value = null
  } finally {
    checking.value = false
  }
}

export async function login(username, password) {
  user.value = await api('/auth/login', { method: 'POST', body: { username, password } })
  sessionExpired.value = false
}

export async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' })
  } finally {
    user.value = null
  }
}
