<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { user, checking, checkSession, logout } from './auth.js'
import LoginPage from './pages/LoginPage.vue'
import ProductTable from './components/ProductTable.vue'
import AddressesPage from './pages/AddressesPage.vue'
import InvestorsPage from './pages/InvestorsPage.vue'

// เมนู: เพิ่มหน้าใหม่ได้โดยเพิ่มรายการที่นี่ (icon = path ของ SVG ขนาด 24x24)
const menu = [
  {
    key: 'products',
    label: 'รายการสินค้า',
    component: ProductTable,
    icon: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  },
  {
    key: 'addresses',
    label: 'ที่อยู่',
    component: AddressesPage,
    icon: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  {
    key: 'investors',
    label: 'รายชื่อผู้ร่วมทุน',
    component: InvestorsPage,
    icon: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  },
]

// เปลี่ยนหน้าด้วย URL แบบ #/products (กด back/forward ของเบราว์เซอร์ได้)
const pageFromHash = () => {
  const key = location.hash.replace(/^#\/?/, '')
  return menu.some((m) => m.key === key) ? key : menu[0].key
}
const current = ref(pageFromHash())
const currentPage = computed(() => menu.find((m) => m.key === current.value))
const onHashChange = () => (current.value = pageFromHash())

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  checkSession()
})
onUnmounted(() => window.removeEventListener('hashchange', onHashChange))

const loggingOut = ref(false)
async function doLogout() {
  loggingOut.value = true
  try {
    await logout()
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div v-if="checking" class="loading">กำลังโหลด…</div>

  <LoginPage v-else-if="!user" />

  <div v-else class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="logo">V</span>
        <strong>vfirst</strong>
      </div>

      <nav>
        <a
          v-for="m in menu"
          :key="m.key"
          :href="`#/${m.key}`"
          :class="{ active: current === m.key }"
          :aria-current="current === m.key ? 'page' : undefined"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="m.icon" /></svg>
          <span>{{ m.label }}</span>
        </a>
      </nav>

      <div class="account">
        <div class="who">
          <span class="avatar">{{ user.display_name.slice(0, 1) }}</span>
          <div>
            <div class="name">{{ user.display_name }}</div>
            <div class="username">@{{ user.username }}</div>
          </div>
        </div>
        <button class="logout" :disabled="loggingOut" @click="doLogout">ออกจากระบบ</button>
      </div>
    </aside>

    <main class="content">
      <KeepAlive>
        <component :is="currentPage.component" :key="currentPage.key" />
      </KeepAlive>
    </main>
  </div>
</template>

<style scoped>
.loading {
  flex: 1;
  display: grid;
  place-items: center;
}
.layout {
  flex: 1;
  display: grid;
  grid-template-columns: 230px 1fr;
  text-align: left;
  min-height: 100svh;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100svh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 14px;
  border-right: 1px solid var(--border);
  background: var(--code-bg);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  font-size: 18px;
  color: var(--text-h);
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: var(--text-h);
  text-decoration: none;
  font-size: 15px;
}
nav a:hover {
  background: var(--accent-bg);
}
nav a.active {
  background: var(--accent);
  color: #fff;
}
nav svg {
  width: 20px;
  height: 20px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.account {
  border-top: 1px solid var(--border);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  min-width: 0;
}
.avatar {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 600;
}
.name {
  color: var(--text-h);
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.username {
  font-size: 12px;
}
.logout {
  font: inherit;
  font-size: 14px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  cursor: pointer;
}
.logout:hover {
  border-color: rgba(217, 45, 32, 0.5);
  color: #d92d20;
}
.content {
  min-width: 0;
}

/* จอเล็ก: เมนูย้ายไปด้านบน */
@media (max-width: 760px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  nav {
    order: 3;
    flex-basis: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  nav a {
    white-space: nowrap;
  }
  .account {
    margin-left: auto;
    border-top: none;
    padding-top: 0;
    flex-direction: row;
    align-items: center;
  }
  .who div {
    display: none;
  }
}
</style>
