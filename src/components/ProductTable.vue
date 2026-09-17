<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { categories } from '../data/products.js'

// ---------- state ----------
const products = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const category = ref('ทั้งหมด')
const sortKey = ref('id')
const sortAsc = ref(true)
const showForm = ref(false)
const saving = ref(false)
const emptyForm = () => ({ sku: '', name: '', category: categories[0], price: 0, stock: 0, image_url: '' })
const form = reactive(emptyForm())
const brokenImages = ref(new Set()) // id ของสินค้าที่โหลดรูปไม่ขึ้น
const previewBroken = ref(false)
const LOW_STOCK = 10

// ---------- API (Cloudflare Pages Functions + D1) ----------
async function api(path, options = {}) {
  const res = await fetch(`/api/products${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`)
  return data
}

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    products.value = await api('')
  } catch (e) {
    error.value = `โหลดข้อมูลไม่สำเร็จ: ${e.message}`
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)

// ---------- helpers ----------
const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })

const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test(String(v ?? '').trim())

function markBroken(id) {
  brokenImages.value = new Set(brokenImages.value).add(id)
}

function showImage(p) {
  return p.image_url && !brokenImages.value.has(p.id)
}

function stockStatus(stock) {
  if (stock === 0) return { label: 'หมด', cls: 'out' }
  if (stock < LOW_STOCK) return { label: 'ใกล้หมด', cls: 'low' }
  return { label: 'มีสินค้า', cls: 'ok' }
}

// ---------- computed ----------
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = products.value.filter((p) => {
    const matchText = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    const matchCat = category.value === 'ทั้งหมด' || p.category === category.value
    return matchText && matchCat
  })
  const dir = sortAsc.value ? 1 : -1
  return [...list].sort((a, b) => {
    const x = a[sortKey.value]
    const y = b[sortKey.value]
    return typeof x === 'number' ? (x - y) * dir : String(x).localeCompare(String(y), 'th') * dir
  })
})

const summary = computed(() => ({
  count: filtered.value.length,
  units: filtered.value.reduce((s, p) => s + p.stock, 0),
  value: filtered.value.reduce((s, p) => s + p.price * p.stock, 0),
  lowStock: filtered.value.filter((p) => p.stock < LOW_STOCK).length,
}))

// ---------- actions ----------
const columns = [
  { key: 'sku', label: 'รหัส' },
  { key: 'name', label: 'ชื่อสินค้า' },
  { key: 'category', label: 'หมวดหมู่' },
  { key: 'price', label: 'ราคา', num: true },
  { key: 'stock', label: 'คงเหลือ', num: true },
]

function sortBy(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}

// อัปเดตหน้าจอทันที แล้วส่งไปบันทึก ถ้าไม่สำเร็จให้คืนค่าเดิม
async function changeStock(p, delta) {
  const old = p.stock
  const next = Math.max(0, old + delta)
  if (next === old) return
  p.stock = next
  try {
    await api(`/${p.id}`, { method: 'PATCH', body: JSON.stringify({ stock: next }) })
  } catch (e) {
    p.stock = old
    error.value = `ปรับสต็อกไม่สำเร็จ: ${e.message}`
  }
}

// แก้ลิงก์รูปของสินค้า (เว้นว่าง = ลบรูป)
async function editImage(p) {
  const input = window.prompt(`ลิงก์รูปของ "${p.name}" (เว้นว่างเพื่อลบรูป)`, p.image_url ?? '')
  if (input === null) return
  const url = input.trim()
  if (url && !isHttpUrl(url)) {
    error.value = 'ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://'
    return
  }
  try {
    const updated = await api(`/${p.id}`, { method: 'PATCH', body: JSON.stringify({ image_url: url }) })
    p.image_url = updated.image_url
    const s = new Set(brokenImages.value)
    s.delete(p.id)
    brokenImages.value = s
  } catch (e) {
    error.value = `บันทึกลิงก์รูปไม่สำเร็จ: ${e.message}`
  }
}

async function removeProduct(p) {
  if (!window.confirm(`ลบ "${p.name}" ใช่ไหม?`)) return
  try {
    await api(`/${p.id}`, { method: 'DELETE' })
    products.value = products.value.filter((x) => x.id !== p.id)
  } catch (e) {
    error.value = `ลบไม่สำเร็จ: ${e.message}`
  }
}

async function addProduct() {
  if (!form.name.trim() || !form.sku.trim()) return
  if (form.image_url.trim() && !isHttpUrl(form.image_url)) {
    error.value = 'ลิงก์รูปต้องขึ้นต้นด้วย http:// หรือ https://'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const created = await api('', {
      method: 'POST',
      body: JSON.stringify({ ...form, price: Number(form.price) || 0, stock: Number(form.stock) || 0 }),
    })
    products.value.push(created)
    Object.assign(form, emptyForm())
    previewBroken.value = false
    showForm.value = false
  } catch (e) {
    error.value = `เพิ่มสินค้าไม่สำเร็จ: ${e.message}`
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="products">
    <header class="top">
      <div>
        <h1>ตารางสินค้า</h1>
        <p class="sub">Demo Vue 3 + Cloudflare D1: ค้นหา กรอง เรียงลำดับ เพิ่ม/ลบ และปรับสต็อก</p>
      </div>
      <div class="actions">
        <button class="ghost" @click="loadProducts" :disabled="loading">โหลดใหม่</button>
        <button class="primary" @click="showForm = !showForm">
          {{ showForm ? 'ปิดฟอร์ม' : '+ เพิ่มสินค้า' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">
      {{ error }} <button class="link" @click="error = ''">ปิด</button>
    </p>

    <!-- สรุปตัวเลข -->
    <div class="stats">
      <div class="stat"><span>รายการ</span><strong>{{ summary.count }}</strong></div>
      <div class="stat"><span>จำนวนชิ้นรวม</span><strong>{{ summary.units.toLocaleString('th-TH') }}</strong></div>
      <div class="stat"><span>มูลค่าสต็อก</span><strong>{{ baht.format(summary.value) }}</strong></div>
      <div class="stat warn"><span>ใกล้หมด/หมด</span><strong>{{ summary.lowStock }}</strong></div>
    </div>

    <!-- ฟอร์มเพิ่มสินค้า -->
    <form v-if="showForm" class="add-form" @submit.prevent="addProduct">
      <label>รหัส<input v-model="form.sku" placeholder="เช่น SN-003" required /></label>
      <label>ชื่อสินค้า<input v-model="form.name" placeholder="ชื่อสินค้า" required /></label>
      <label>หมวดหมู่
        <select v-model="form.category">
          <option v-for="c in categories" :key="c">{{ c }}</option>
        </select>
      </label>
      <label>ราคา (บาท)<input v-model.number="form.price" type="number" min="0" step="0.01" /></label>
      <label>จำนวน<input v-model.number="form.stock" type="number" min="0" /></label>
      <label class="span-2">ลิงก์รูป (ไม่บังคับ)
        <input
          v-model="form.image_url"
          type="url"
          placeholder="https://…/photo.jpg"
          @input="previewBroken = false"
        />
      </label>
      <div class="preview">
        <img
          v-if="isHttpUrl(form.image_url) && !previewBroken"
          :src="form.image_url"
          alt="ตัวอย่างรูป"
          @error="previewBroken = true"
        />
        <span v-else>{{ form.image_url && previewBroken ? 'โหลดรูปไม่ได้' : 'ตัวอย่างรูป' }}</span>
      </div>
      <button class="primary" type="submit" :disabled="saving">{{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}</button>
    </form>

    <!-- ตัวกรอง -->
    <div class="toolbar">
      <input v-model="search" type="search" placeholder="ค้นหาชื่อหรือรหัสสินค้า…" />
      <div class="chips">
        <button
          v-for="c in ['ทั้งหมด', ...categories]"
          :key="c"
          :class="['chip', { active: category === c }]"
          @click="category = c"
        >{{ c }}</button>
      </div>
    </div>

    <!-- ตาราง -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="thumb-col">รูป</th>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="{ num: col.num, sorted: sortKey === col.key }"
              @click="sortBy(col.key)"
            >
              {{ col.label }}
              <span class="arrow">{{ sortKey === col.key ? (sortAsc ? '▲' : '▼') : '↕' }}</span>
            </th>
            <th>สถานะ</th>
            <th class="num">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id">
            <td class="thumb-col">
              <button type="button" class="thumb" :title="p.image_url ? 'แก้ลิงก์รูป' : 'เพิ่มลิงก์รูป'" @click="editImage(p)">
                <img v-if="showImage(p)" :src="p.image_url" :alt="p.name" loading="lazy" @error="markBroken(p.id)" />
                <span v-else-if="p.image_url" class="no-img">⚠</span>
                <span v-else class="no-img">+</span>
              </button>
            </td>
            <td class="mono">{{ p.sku }}</td>
            <td class="name">{{ p.name }}</td>
            <td>{{ p.category }}</td>
            <td class="num">{{ baht.format(p.price) }}</td>
            <td class="num">
              <div class="stepper">
                <button type="button" @click="changeStock(p, -1)" :disabled="p.stock === 0">−</button>
                <span>{{ p.stock }}</span>
                <button type="button" @click="changeStock(p, 1)">+</button>
              </div>
            </td>
            <td><span :class="['badge', stockStatus(p.stock).cls]">{{ stockStatus(p.stock).label }}</span></td>
            <td class="num"><button class="danger" @click="removeProduct(p)">ลบ</button></td>
          </tr>
          <tr v-if="loading">
            <td colspan="8" class="empty">กำลังโหลดข้อมูล…</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="8" class="empty">ไม่พบสินค้าที่ตรงกับเงื่อนไข</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.products {
  text-align: left;
  padding: 32px 24px;
  font-size: 15px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.5px;
}
.sub {
  margin: 4px 0 0;
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  font: inherit;
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-h);
  padding: 6px 14px;
}
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.ghost:hover,
.chip:hover {
  border-color: var(--accent-border);
}
.danger {
  color: #d92d20;
  padding: 4px 10px;
}
.danger:hover {
  background: rgba(217, 45, 32, 0.1);
  border-color: rgba(217, 45, 32, 0.4);
}

.error {
  margin: 16px 0 0;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}
.link {
  border: none;
  padding: 0 4px;
  text-decoration: underline;
  color: inherit;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin: 24px 0;
}
.stat {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}
.stat span {
  font-size: 13px;
}
.stat strong {
  font-size: 22px;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}
.stat.warn strong {
  color: #d97706;
}

.add-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  align-items: end;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  border-radius: 8px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
input,
select {
  box-sizing: border-box;
  height: 38px;
  font: inherit;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}
input:focus,
select:focus {
  outline: 2px solid var(--accent-border);
  outline-offset: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.toolbar input {
  flex: 1 1 240px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
}
.chip.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}
th,
td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}
th {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  background: var(--code-bg);
  cursor: pointer;
  user-select: none;
}
th.sorted {
  color: var(--accent);
}
.arrow {
  font-size: 10px;
  opacity: 0.6;
}
tbody tr:last-child td {
  border-bottom: none;
}
tbody tr:hover {
  background: var(--accent-bg);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mono {
  font-family: var(--mono);
  font-size: 13px;
}
.name {
  color: var(--text-h);
  font-weight: 500;
}
.empty {
  text-align: center;
  padding: 32px;
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.stepper button {
  width: 26px;
  height: 26px;
  padding: 0;
  line-height: 1;
}
.stepper span {
  min-width: 32px;
  text-align: center;
  color: var(--text-h);
}

.badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 500;
}
.badge.ok {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}
.badge.low {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
}
.badge.out {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}
@media (prefers-color-scheme: dark) {
  .badge.ok { color: #4ade80; }
  .badge.low { color: #fbbf24; }
  .badge.out { color: #f87171; }
}
.span-2 {
  grid-column: span 2;
}
.preview {
  width: 64px;
  height: 64px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-size: 11px;
  text-align: center;
  background: var(--bg);
}
.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-col {
  width: 56px;
  cursor: default;
}
.thumb {
  width: 44px;
  height: 44px;
  padding: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--code-bg);
}
.thumb:hover {
  border-color: var(--accent);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.no-img {
  font-size: 18px;
  color: var(--text);
  opacity: 0.6;
}
@media (max-width: 640px) {
  .span-2 {
    grid-column: auto;
  }
}
</style>
