import { ref } from 'vue'

const STORAGE_KEY = 'ai-canvas-request-logs'
const MAX_LOGS = 200

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const truncate = (value, max = 500) => {
  if (value == null) return ''
  let str
  if (typeof value === 'string') {
    str = value
  } else {
    try {
      str = JSON.stringify(value)
    } catch {
      str = '[unserializable]'
    }
  }
  return str.length > max ? `${str.slice(0, max)}…` : str
}

const sanitizePreview = (payload) => {
  if (!payload) return ''
  if (typeof payload === 'string') return truncate(payload, 500)

  const copy = Array.isArray(payload) ? payload.slice(0, 5) : { ...payload }

  if (copy.image) {
    copy.image = '[image]'
  }
  if (copy.images) {
    copy.images = `[images:${Array.isArray(copy.images) ? copy.images.length : 1}]`
  }
  if (copy.messages) {
    copy.messages = `[messages:${Array.isArray(copy.messages) ? copy.messages.length : 0}]`
  }
  if (copy.prompt && typeof copy.prompt === 'string') {
    copy.prompt = truncate(copy.prompt, 200)
  }

  return truncate(copy, 800)
}

const loadInitial = () => {
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? safeJsonParse(raw, []) : []
  return Array.isArray(parsed) ? parsed : []
}

export const requestLogs = ref(loadInitial())

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requestLogs.value))
  } catch {}
}

const generateId = () => `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

export const addRequestLog = (entry) => {
  const now = Date.now()
  const id = generateId()
  const log = {
    id,
    ts: now,
    type: entry.type || 'unknown',
    model: entry.model || '',
    method: entry.method || '',
    url: entry.url || '',
    status: 'pending',
    httpStatus: null,
    durationMs: null,
    requestPreview: sanitizePreview(entry.requestPreview),
    errorMessage: '',
    responsePreview: ''
  }

  requestLogs.value = [log, ...requestLogs.value].slice(0, MAX_LOGS)
  persist()
  return id
}

export const updateRequestLog = (id, patch) => {
  const index = requestLogs.value.findIndex(l => l.id === id)
  if (index === -1) return false

  requestLogs.value[index] = {
    ...requestLogs.value[index],
    ...patch,
    requestPreview: patch?.requestPreview ? sanitizePreview(patch.requestPreview) : requestLogs.value[index].requestPreview,
    responsePreview: patch?.responsePreview ? truncate(patch.responsePreview, 800) : requestLogs.value[index].responsePreview
  }
  persist()
  return true
}

export const clearRequestLogs = () => {
  requestLogs.value = []
  persist()
}
