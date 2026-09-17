<script setup>
import CrudTable from '../components/CrudTable.vue'

const fields = [
  { key: 'label', label: 'ชื่อสถานที่', required: true, placeholder: 'เช่น สำนักงานใหญ่' },
  { key: 'contact', label: 'ผู้ติดต่อ' },
  { key: 'phone', label: 'เบอร์โทร', type: 'tel', placeholder: '08x-xxx-xxxx' },
  { key: 'line1', label: 'ที่อยู่ (เลขที่ ถนน หมู่)', required: true, wide: true },
  { key: 'subdistrict', label: 'ตำบล/แขวง' },
  { key: 'district', label: 'อำเภอ/เขต' },
  { key: 'province', label: 'จังหวัด', required: true },
  { key: 'postcode', label: 'รหัสไปรษณีย์', placeholder: '92000', maxlength: 5 },
  { key: 'note', label: 'หมายเหตุ', type: 'textarea', wide: true },
]

const fullAddress = (r) =>
  [r.line1, r.subdistrict && `ต.${r.subdistrict}`, r.district && `อ.${r.district}`, r.province && `จ.${r.province}`, r.postcode]
    .filter(Boolean)
    .join(' ')

const columns = [
  { key: 'label', label: 'ชื่อสถานที่', class: 'strong' },
  { key: 'contact', label: 'ผู้ติดต่อ' },
  { key: 'address', label: 'ที่อยู่', value: fullAddress, sortable: false },
  { key: 'province', label: 'จังหวัด' },
]
</script>

<template>
  <CrudTable
    resource="addresses"
    title="ที่อยู่"
    subtitle="ที่อยู่สำนักงาน สาขา และคลังสินค้า"
    item-name="ที่อยู่"
    title-key="label"
    search-placeholder="ค้นหาชื่อสถานที่ ผู้ติดต่อ จังหวัด…"
    :fields="fields"
    :columns="columns"
  >
    <template #cell-contact="{ row }">
      <div>{{ row.contact || '–' }}</div>
      <a v-if="row.phone" class="muted" :href="`tel:${row.phone}`">{{ row.phone }}</a>
    </template>
    <template #cell-address="{ row, value }">
      <div>{{ value }}</div>
      <div v-if="row.note" class="muted note">{{ row.note }}</div>
    </template>
  </CrudTable>
</template>

<style scoped>
.muted {
  font-size: 13px;
}
a.muted {
  color: var(--accent);
  text-decoration: none;
}
.note {
  font-style: italic;
  margin-top: 2px;
}
</style>
