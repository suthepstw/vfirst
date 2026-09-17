<script setup>
import { ref, reactive, computed } from 'vue'
import { categories, initialProducts } from '../data/products.js'

// ---------- state ----------
const products = ref(initialProducts.map((p) => ({ ...p })))
const search = ref('')
const category = ref('ทั้งหมด')
const sortKey = ref('id')
const sortAsc = ref(true)
const showForm = ref(false)
const form = reactive({ sku: '', name: '', category: categories[0], price: 0, stock: 0 })
const LOW_STOCK = 10

// ---------- helpers ----------
const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })

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

function changeStock(p, delta) {
  p.stock = Math.max(0, p.stock + delta)
}

function removeProduct(id) {
  products.value = products.value.filter((p) => p.id !== id)
}

function addProduct() {
  if (!form.name.trim() || !form.sku.trim()) return
  const nextId = Math.max(0, ...products.value.map((p) => p.id)) + 1
  products.value.push({
    id: nextId,
    sku: form.sku.trim().toUpperCase(),
    name: form.name.trim(),
    category: form.category,
    price: Number(form.price) || 0,
    stock: Number(form.stock) || 0,
  })
  Object.assign(form, { sku: '', name: '', category: categories[0], price: 0, stock: 0 })
  showForm.value = false
}

function resetData() {
  products.value = initialProducts.map((p) => ({ ...p }))
  search.value = ''
  category.value = 'ทั้งหมด'
}
</script>

<template>
  <section class="products">
    <header class="top">
      <div>
        <h1>ตารางสินค้า</h1>
        <p class="sub">Demo Vue 3: ค้นหา กรอง เรียงลำดับ เพิ่ม/ลบ และปรับสต็อก</p>
      </div>
      <div class="actions">
        <button class="ghost" @click="resetData">รีเซ็ตข้อมูล</button>
        <button class="primary" @click="showForm = !showForm">
          {{ showForm ? 'ปิดฟอร์ม' : '+ เพิ่มสินค้า' }}
        </button>
      </div>
    </header>

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
      <button class="primary" type="submit">บันทึก</button>
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
            <td class="num"><button class="danger" @click="removeProduct(p.id)">ลบ</button></td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="empty">ไม่พบสินค้าที่ตรงกับเงื่อนไข</td>
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
</style>
