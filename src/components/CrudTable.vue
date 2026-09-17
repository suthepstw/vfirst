<script setup>
// ตารางจัดการข้อมูลทั่วไป: ค้นหา เรียงลำดับ เพิ่ม แก้ไข ลบ
//   resource : ชื่อ API เช่น 'addresses'
//   fields   : ช่องในฟอร์ม [{ key, label, type, required, placeholder, wide, step, min, max }]
//   columns  : คอลัมน์ในตาราง [{ key, label, value?(row), num?, sortable? }]
//   titleKey : ฟิลด์ที่ใช้เป็นชื่อรายการตอนยืนยันการลบ
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '../api.js'

const props = defineProps({
  resource: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  itemName: { type: String, default: 'รายการ' },
  fields: { type: Array, required: true },
  columns: { type: Array, required: true },
  titleKey: { type: String, default: 'name' },
  searchPlaceholder: { type: String, default: 'ค้นหา…' },
})

const rows = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const search = ref('')
const sortKey = ref(null)
const sortAsc = ref(true)
const formOpen = ref(false)
const editingId = ref(null)

const blank = () =>
  Object.fromEntries(props.fields.map((f) => [f.key, f.type === 'number' ? (f.default ?? 0) : '']))
const form = reactive(blank())

const cellValue = (col, row) => (col.value ? col.value(row) : row[col.key])

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await api(`/${props.resource}`)
  } catch (e) {
    error.value = `โหลดข้อมูลไม่สำเร็จ: ${e.message}`
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = rows.value
  if (q) {
    list = list.filter((r) =>
      props.fields.some((f) => String(r[f.key] ?? '').toLowerCase().includes(q))
    )
  }
  if (!sortKey.value) return list
  const col = props.columns.find((c) => c.key === sortKey.value)
  const dir = sortAsc.value ? 1 : -1
  return [...list].sort((a, b) => {
    const x = col.sortValue ? col.sortValue(a) : a[col.key]
    const y = col.sortValue ? col.sortValue(b) : b[col.key]
    if (x == null) return 1
    if (y == null) return -1
    return typeof x === 'number' ? (x - y) * dir : String(x).localeCompare(String(y), 'th') * dir
  })
})

function sortBy(col) {
  if (col.sortable === false) return
  if (sortKey.value === col.key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = col.key
    sortAsc.value = true
  }
}

function openCreate() {
  Object.assign(form, blank())
  editingId.value = null
  formOpen.value = true
}

function openEdit(row) {
  Object.assign(form, blank())
  for (const f of props.fields) form[f.key] = row[f.key] ?? (f.type === 'number' ? 0 : '')
  editingId.value = row.id
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = null
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (editingId.value === null) {
      const created = await api(`/${props.resource}`, { method: 'POST', body: { ...form } })
      rows.value.push(created)
    } else {
      const updated = await api(`/${props.resource}/${editingId.value}`, {
        method: 'PATCH',
        body: { ...form },
      })
      const i = rows.value.findIndex((r) => r.id === updated.id)
      if (i >= 0) rows.value[i] = updated
    }
    closeForm()
  } catch (e) {
    error.value = `บันทึกไม่สำเร็จ: ${e.message}`
  } finally {
    saving.value = false
  }
}

async function remove(row) {
  if (!window.confirm(`ลบ "${row[props.titleKey]}" ใช่ไหม?`)) return
  error.value = ''
  try {
    await api(`/${props.resource}/${row.id}`, { method: 'DELETE' })
    rows.value = rows.value.filter((r) => r.id !== row.id)
    if (editingId.value === row.id) closeForm()
  } catch (e) {
    error.value = `ลบไม่สำเร็จ: ${e.message}`
  }
}
</script>

<template>
  <section class="crud">
    <header class="top">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="sub">{{ subtitle }}</p>
      </div>
      <div class="actions">
        <button class="ghost" @click="load" :disabled="loading">โหลดใหม่</button>
        <button class="primary" @click="formOpen && editingId === null ? closeForm() : openCreate()">
          {{ formOpen && editingId === null ? 'ปิดฟอร์ม' : `+ เพิ่ม${itemName}` }}
        </button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">
      {{ error }} <button class="link" @click="error = ''">ปิด</button>
    </p>

    <!-- ส่วนสรุป (หน้าเรียกใช้กำหนดเองได้) -->
    <slot name="summary" :rows="filtered" :all-rows="rows" />

    <form v-if="formOpen" class="edit-form" @submit.prevent="save">
      <h2>{{ editingId === null ? `เพิ่ม${itemName}` : `แก้ไข${itemName}` }}</h2>
      <div class="grid">
        <label v-for="f in fields" :key="f.key" :class="{ wide: f.wide }">
          <span>{{ f.label }}<b v-if="f.required" class="req">*</b></span>
          <textarea
            v-if="f.type === 'textarea'"
            v-model="form[f.key]"
            rows="2"
            :placeholder="f.placeholder"
            :required="f.required"
          />
          <input
            v-else-if="f.type === 'number'"
            v-model.number="form[f.key]"
            type="number"
            :step="f.step ?? 'any'"
            :min="f.min"
            :max="f.max"
            :required="f.required"
          />
          <input
            v-else
            v-model="form[f.key]"
            :type="f.type || 'text'"
            :placeholder="f.placeholder"
            :required="f.required"
            :maxlength="f.maxlength"
          />
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="ghost" @click="closeForm">ยกเลิก</button>
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}
        </button>
      </div>
    </form>

    <div class="toolbar">
      <input v-model="search" type="search" :placeholder="searchPlaceholder" />
      <span class="count">{{ filtered.length }} / {{ rows.length }} รายการ</span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="{ num: col.num, sorted: sortKey === col.key, nosort: col.sortable === false }"
              @click="sortBy(col)"
            >
              {{ col.label }}
              <span v-if="col.sortable !== false" class="arrow">
                {{ sortKey === col.key ? (sortAsc ? '▲' : '▼') : '↕' }}
              </span>
            </th>
            <th class="num nosort">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + 1" class="empty">กำลังโหลดข้อมูล…</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td :colspan="columns.length + 1" class="empty">
              {{ rows.length ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูล' }}
            </td>
          </tr>
          <template v-else>
          <tr v-for="row in filtered" :key="row.id" :class="{ editing: editingId === row.id }">
            <td v-for="col in columns" :key="col.key" :class="[col.class, { num: col.num }]">
              <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(col, row)">
                {{ cellValue(col, row) ?? '–' }}
              </slot>
            </td>
            <td class="num">
              <div class="row-actions">
                <button @click="openEdit(row)">แก้ไข</button>
                <button class="danger" @click="remove(row)">ลบ</button>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.crud {
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
  margin-bottom: 20px;
}
h1 {
  margin: 0;
  font-size: 32px;
  letter-spacing: -0.5px;
}
h2 {
  margin: 0 0 12px;
  font-size: 18px;
}
.sub {
  margin: 4px 0 0;
}
.actions,
.form-actions {
  display: flex;
  gap: 8px;
}
.form-actions {
  justify-content: flex-end;
  margin-top: 16px;
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
  opacity: 0.5;
  cursor: not-allowed;
}
.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.ghost:hover {
  border-color: var(--accent-border);
}
.link {
  border: none;
  padding: 0 4px;
  text-decoration: underline;
  color: inherit;
}
.error {
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.edit-form {
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  border-radius: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
label.wide {
  grid-column: 1 / -1;
}
.req {
  color: #dc2626;
  margin-left: 2px;
}
input,
textarea {
  box-sizing: border-box;
  font: inherit;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}
input {
  height: 38px;
}
textarea {
  resize: vertical;
}
input:focus,
textarea:focus {
  outline: 2px solid var(--accent-border);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.toolbar input {
  flex: 1;
  max-width: 420px;
}
.count {
  font-size: 13px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
th {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  background: var(--code-bg);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  text-align: left;
}
th.nosort {
  cursor: default;
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
tbody tr:hover,
tbody tr.editing {
  background: var(--accent-bg);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.empty {
  text-align: center;
  padding: 32px;
}
.row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.row-actions button {
  padding: 4px 10px;
}
.danger {
  color: #d92d20;
}
.danger:hover {
  background: rgba(217, 45, 32, 0.1);
  border-color: rgba(217, 45, 32, 0.4);
}
:deep(.strong) {
  color: var(--text-h);
  font-weight: 500;
}
:deep(.muted) {
  font-size: 13px;
}
</style>
