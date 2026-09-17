<script setup>
import { ref } from 'vue'
import { login, sessionExpired } from '../auth.js'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
  } catch (e) {
    error.value = e.message
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="card" @submit.prevent="submit">
      <div class="brand">
        <span class="logo" aria-hidden="true">V</span>
        <div>
          <h1>เข้าสู่ระบบ</h1>
          <p>ระบบจัดการร้านค้า vfirst</p>
        </div>
      </div>

      <p v-if="sessionExpired && !error" class="notice">หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <label>
        ชื่อผู้ใช้
        <input v-model="username" autocomplete="username" autofocus required />
      </label>

      <label>
        รหัสผ่าน
        <span class="pw">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
          />
          <button type="button" class="toggle" @click="showPassword = !showPassword">
            {{ showPassword ? 'ซ่อน' : 'แสดง' }}
          </button>
        </span>
      </label>

      <button class="primary" type="submit" :disabled="loading">
        {{ loading ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 32px 16px;
  text-align: left;
}
.card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px 28px;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  background: var(--bg);
  font-size: 15px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  font-size: 22px;
}
h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: -0.3px;
}
.brand p {
  margin: 0;
  font-size: 13px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
input {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  font: inherit;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}
input:focus {
  outline: 2px solid var(--accent-border);
}
.pw {
  position: relative;
}
.pw input {
  padding-right: 64px;
}
.toggle {
  position: absolute;
  right: 6px;
  top: 6px;
  height: 28px;
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  background: var(--code-bg);
  color: var(--text-h);
  cursor: pointer;
}
.primary {
  height: 42px;
  font: inherit;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  margin-top: 4px;
}
.primary:disabled {
  opacity: 0.6;
  cursor: wait;
}
.error,
.notice {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
}
.error {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}
.notice {
  background: var(--accent-bg);
  color: var(--text-h);
}
</style>
