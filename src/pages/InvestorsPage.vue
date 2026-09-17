<script setup>
import CrudTable from '../components/CrudTable.vue'

const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 })
const thaiDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : null

const fields = [
  { key: 'name', label: 'ชื่อผู้ร่วมทุน', required: true, wide: true },
  { key: 'email', label: 'อีเมล', type: 'email' },
  { key: 'phone', label: 'เบอร์โทร', type: 'tel' },
  { key: 'amount', label: 'เงินลงทุน (บาท)', type: 'number', min: 0, step: '0.01' },
  { key: 'share_percent', label: 'สัดส่วนหุ้น (%)', type: 'number', min: 0, max: 100, step: '0.01' },
  { key: 'joined_on', label: 'วันที่ร่วมทุน', type: 'date' },
  { key: 'note', label: 'หมายเหตุ', type: 'textarea', wide: true },
]

const columns = [
  { key: 'name', label: 'ชื่อผู้ร่วมทุน', class: 'strong' },
  { key: 'email', label: 'ติดต่อ' },
  { key: 'amount', label: 'เงินลงทุน', num: true, value: (r) => baht.format(r.amount), sortValue: (r) => r.amount },
  { key: 'share_percent', label: 'สัดส่วนหุ้น', sortValue: (r) => r.share_percent },
  { key: 'joined_on', label: 'วันที่ร่วมทุน', value: (r) => thaiDate(r.joined_on) },
]

const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
</script>

<template>
  <CrudTable
    resource="investors"
    title="รายชื่อผู้ร่วมทุน"
    subtitle="เงินลงทุนและสัดส่วนหุ้นของผู้ร่วมทุนแต่ละราย"
    item-name="ผู้ร่วมทุน"
    search-placeholder="ค้นหาชื่อ อีเมล เบอร์โทร…"
    :fields="fields"
    :columns="columns"
  >
    <template #summary="{ allRows }">
      <div class="stats">
        <div class="stat"><span>ผู้ร่วมทุน</span><strong>{{ allRows.length }} ราย</strong></div>
        <div class="stat"><span>เงินลงทุนรวม</span><strong>{{ baht.format(sum(allRows, 'amount')) }}</strong></div>
        <div class="stat" :class="{ warn: Math.abs(sum(allRows, 'share_percent') - 100) > 0.01 }">
          <span>สัดส่วนหุ้นรวม</span>
          <strong>{{ sum(allRows, 'share_percent').toLocaleString('th-TH', { maximumFractionDigits: 2 }) }}%</strong>
          <small v-if="Math.abs(sum(allRows, 'share_percent') - 100) > 0.01">ยังไม่ครบ/เกิน 100%</small>
        </div>
      </div>
    </template>

    <template #cell-email="{ row }">
      <a v-if="row.email" :href="`mailto:${row.email}`">{{ row.email }}</a>
      <div v-if="row.phone" class="muted">{{ row.phone }}</div>
      <span v-if="!row.email && !row.phone">–</span>
    </template>

    <template #cell-share_percent="{ row }">
      <div class="share">
        <div class="bar"><div class="fill" :style="{ width: `${Math.min(row.share_percent, 100)}%` }" /></div>
        <span>{{ row.share_percent.toLocaleString('th-TH', { maximumFractionDigits: 2 }) }}%</span>
      </div>
    </template>
  </CrudTable>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.stat {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}
.stat span,
.stat small {
  font-size: 13px;
}
.stat strong {
  font-size: 22px;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}
.stat.warn strong,
.stat.warn small {
  color: #d97706;
}
a {
  color: var(--accent);
  text-decoration: none;
}
.muted {
  font-size: 13px;
}
.share {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 150px;
}
.bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--code-bg);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
}
.share span {
  min-width: 48px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
