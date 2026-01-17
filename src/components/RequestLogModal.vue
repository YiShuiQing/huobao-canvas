<template>
  <n-modal v-model:show="show" preset="card" title="请求日志" style="width: 1100px; max-width: 95vw;">
    <div class="flex flex-wrap gap-2 mb-3 items-center">
      <n-date-picker v-model:value="timeRange" type="datetimerange" clearable />
      <n-select v-model:value="typeFilter" :options="typeOptions" class="w-40" clearable placeholder="类型" />
      <n-input v-model:value="keyword" class="flex-1 min-w-[220px]" clearable placeholder="搜索模型 / URL / 错误信息" />
      <n-button secondary @click="handleRefresh">刷新</n-button>
      <n-button type="error" secondary @click="clearRequestLogs">清空</n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="filteredLogs"
      :pagination="{ pageSize: 12 }"
      :max-height="520"
      :row-props="rowProps"
    />

    <n-modal v-model:show="showDetail" preset="card" title="日志详情" style="width: 900px; max-width: 95vw;">
      <div class="space-y-2">
        <div class="text-sm">
          <span class="font-medium">时间：</span>{{ formatTime(currentDetail?.ts) }}
        </div>
        <div class="text-sm">
          <span class="font-medium">类型：</span>{{ currentDetail?.type }}
          <span class="ml-3 font-medium">状态：</span>{{ currentDetail?.status }}
          <span class="ml-3 font-medium">HTTP：</span>{{ currentDetail?.httpStatus ?? '-' }}
          <span class="ml-3 font-medium">耗时：</span>{{ currentDetail?.durationMs ?? '-' }}ms
        </div>
        <div class="text-sm break-all">
          <span class="font-medium">URL：</span>{{ currentDetail?.url || '-' }}
        </div>
        <div class="text-sm">
          <span class="font-medium">模型：</span>{{ currentDetail?.model || '-' }}
        </div>
        <div class="text-sm">
          <span class="font-medium">请求：</span>
        </div>
        <pre class="text-xs p-3 rounded bg-[var(--bg-tertiary)] whitespace-pre-wrap break-words">{{ currentDetail?.requestPreview || '-' }}</pre>
        <div v-if="currentDetail?.responsePreview" class="text-sm">
          <span class="font-medium">响应：</span>
        </div>
        <pre v-if="currentDetail?.responsePreview" class="text-xs p-3 rounded bg-[var(--bg-tertiary)] whitespace-pre-wrap break-words">{{ currentDetail?.responsePreview }}</pre>
        <div v-if="currentDetail?.errorMessage" class="text-sm text-red-500">
          <span class="font-medium">错误：</span>{{ currentDetail?.errorMessage }}
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showDetail = false">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </n-modal>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { NModal, NDataTable, NTag, NButton, NInput, NSelect, NDatePicker } from 'naive-ui'
import { requestLogs, clearRequestLogs } from '@/stores/requestLog'

const show = defineModel('show', { type: Boolean, default: false })

const keyword = ref('')
const typeFilter = ref(null)
const timeRange = ref(null)
const showDetail = ref(false)
const currentDetail = ref(null)

const typeOptions = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '聊天', value: 'chat' },
  { label: '模型列表', value: 'models' },
  { label: '其他', value: 'unknown' }
]

const formatTime = (ts) => {
  if (!ts) return '-'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

const inTimeRange = (ts, range) => {
  if (!range || !Array.isArray(range) || range.length !== 2) return true
  const [start, end] = range
  if (!start || !end) return true
  return ts >= start && ts <= end
}

const filteredLogs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return requestLogs.value.filter(l => {
    if (typeFilter.value && l.type !== typeFilter.value) return false
    if (!inTimeRange(l.ts, timeRange.value)) return false
    if (!kw) return true
    const haystack = `${l.type} ${l.model} ${l.url} ${l.errorMessage}`.toLowerCase()
    return haystack.includes(kw)
  })
})

const statusTag = (row) => {
  if (row.status === 'success') return h(NTag, { type: 'success', size: 'small' }, { default: () => '成功' })
  if (row.status === 'error') return h(NTag, { type: 'error', size: 'small' }, { default: () => '失败' })
  return h(NTag, { size: 'small' }, { default: () => '进行中' })
}

const typeTag = (row) => {
  const map = {
    image: { label: '图片', type: 'success' },
    video: { label: '视频', type: 'warning' },
    chat: { label: '聊天', type: 'info' },
    models: { label: '模型列表', type: 'default' },
    unknown: { label: '其他', type: 'default' }
  }
  const meta = map[row.type] || map.unknown
  return h(NTag, { type: meta.type, size: 'small' }, { default: () => meta.label })
}

const openDetail = (row) => {
  currentDetail.value = row
  showDetail.value = true
}

const columns = [
  {
    title: '时间',
    key: 'ts',
    width: 170,
    render: (row) => formatTime(row.ts)
  },
  {
    title: '类型',
    key: 'type',
    width: 90,
    render: (row) => typeTag(row)
  },
  {
    title: '模型',
    key: 'model',
    width: 160,
    ellipsis: true
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => statusTag(row)
  },
  {
    title: 'HTTP',
    key: 'httpStatus',
    width: 70,
    render: (row) => row.httpStatus ?? '-'
  },
  {
    title: '耗时(ms)',
    key: 'durationMs',
    width: 90,
    render: (row) => row.durationMs ?? '-'
  },
  {
    title: 'URL',
    key: 'url',
    ellipsis: true
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '查看' })
  }
]

const rowProps = (row) => {
  if (row.status !== 'error') return
  return { style: 'background: rgba(239, 68, 68, 0.06)' }
}

const handleRefresh = () => {
  requestLogs.value = [...requestLogs.value]
}
</script>

