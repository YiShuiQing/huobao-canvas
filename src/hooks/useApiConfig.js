/**
 * API Config Hook | API 配置 Hook
 */

import { ref, computed, watch } from 'vue'
import { setBaseUrl as setRequestBaseUrl } from '@/utils'
import { DEFAULT_API_BASE_URL, STORAGE_KEYS, DEFAULT_ENDPOINTS } from '@/utils'
import { getProvider } from '@/config/providers'
import { addRequestLog, updateRequestLog } from '@/stores/requestLog'
import { classifyAndMergeModels } from '@/stores/models'

/**
 * Get stored value from localStorage | 从 localStorage 获取存储值
 */
const getStored = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored value to localStorage | 设置存储值到 localStorage
 */
const setStored = (key, value) => {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage errors
  }
}

// Global State | 全局状态
const apiKey = ref(getStored(STORAGE_KEYS.API_KEY))
const baseUrl = ref(getStored(STORAGE_KEYS.BASE_URL, DEFAULT_API_BASE_URL))
const provider = ref(getStored(STORAGE_KEYS.PROVIDER, 'custom'))

// Fix: Sanitize Base URL on init (recover from proxy path to full URL)
// 修复: 初始化时清洗 Base URL (将代理路径恢复为完整 URL)
if (provider.value !== 'custom') {
  const p = getProvider(provider.value)
  if (p && baseUrl.value === '/volc-api') {
    baseUrl.value = p.defaultBaseUrl
  }
}

// Model State | 模型状态
const selectedModel = ref(getStored('apiModel', ''))
const availableModels = ref([])
const isFetchingModels = ref(false)

// Parse stored endpoints | 解析存储的端点
let initialEndpoints = { ...DEFAULT_ENDPOINTS }
try {
  const stored = localStorage.getItem(STORAGE_KEYS.ENDPOINTS)
  if (stored) {
    initialEndpoints = { ...initialEndpoints, ...JSON.parse(stored) }
  }
} catch (e) {
  console.error('Failed to parse endpoints', e)
}
const customEndpoints = ref(initialEndpoints)

// Initialize Base URL in Request | 初始化请求的基础 URL
setRequestBaseUrl(baseUrl.value)

// Computed active endpoints | 计算当前生效的端点
const activeEndpoints = computed(() => {
  // Always allow custom overrides, regardless of provider
  return customEndpoints.value
})

// Watchers | 监听器
watch(apiKey, (newKey) => setStored(STORAGE_KEYS.API_KEY, newKey))

watch(baseUrl, (newUrl) => {
  setRequestBaseUrl(newUrl)
  setStored(STORAGE_KEYS.BASE_URL, newUrl)
})

watch(provider, (newProvider) => {
  setStored(STORAGE_KEYS.PROVIDER, newProvider)
  if (newProvider !== 'custom') {
    const p = getProvider(newProvider)
    if (p && p.defaultBaseUrl) {
      baseUrl.value = p.defaultBaseUrl
    }
  }
})

watch(selectedModel, (newModel) => setStored('apiModel', newModel))

watch(customEndpoints, (newEndpoints) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ENDPOINTS, JSON.stringify(newEndpoints))
  } catch (e) {}
}, { deep: true })

/**
 * Get current endpoint path by type | 获取当前端点路径
 * @param {string} type - 'chat', 'image', 'video', etc.
 */
export const getEndpoint = (type) => {
  return activeEndpoints.value[type] || DEFAULT_ENDPOINTS[type]
}

/**
 * Fetch models from API | 从 API 获取模型列表
 */
const fetchModels = async () => {
  if (!apiKey.value || !baseUrl.value) return []
  if (isFetchingModels.value) return availableModels.value
  
  isFetchingModels.value = true
  try {
    let url = ''
    const currentProvider = getProvider(provider.value)
    
    // Determine effective Base URL
    let effectiveBaseUrl = baseUrl.value

    // Determine URL for models endpoint
    if (currentProvider && currentProvider.modelListUrl) {
      if (currentProvider.modelListUrl.startsWith('http')) {
        url = currentProvider.modelListUrl
      } else {
        // Handle relative path (remove trailing slash from base, remove leading slash from endpoint)
        const base = effectiveBaseUrl.replace(/\/+$/, '')
        const path = currentProvider.modelListUrl.replace(/^\/+/, '')
        url = `${base}/${path}`
      }
    } else {
      // Default fallback
      url = `${effectiveBaseUrl.replace(/\/+$/, '')}/models`
    }

    console.log('[fetchModels] Requesting:', url)
    const startTs = Date.now()
    const logId = addRequestLog({
      type: 'models',
      method: 'GET',
      url,
      requestPreview: { provider: provider.value, baseUrl: effectiveBaseUrl }
    })

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      updateRequestLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs: Date.now() - startTs,
        errorMessage: `HTTP ${res.status} ${res.statusText}`,
        responsePreview: errorText
      })
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${errorText.substring(0, 100)}`)
    }
    
    const data = await res.json()
    // Standard OpenAI format: { data: [{ id: 'model-name', ... }] }
    if (data && Array.isArray(data.data)) {
      availableModels.value = data.data.map(m => ({
        label: m.id,
        value: m.id,
        raw: m
      }))
      classifyAndMergeModels(data.data)
      
      updateRequestLog(logId, {
        status: 'success',
        httpStatus: res.status,
        durationMs: Date.now() - startTs,
        responsePreview: data.data.slice(0, 20).map(x => x.id)
      })

      return availableModels.value
    }
    updateRequestLog(logId, {
      status: 'success',
      httpStatus: res.status,
      durationMs: Date.now() - startTs,
      responsePreview: data
    })
    return []
  } catch (e) {
    console.error('Failed to fetch models:', e)
    if (e.message === 'Failed to fetch' || e.message === 'Load failed') {
       throw new Error(`网络请求失败: ${e.message} (可能是跨域 CORS 或地址不可达)`)
    }
    throw e
  } finally {
    isFetchingModels.value = false
  }
}

/**
 * API Configuration Hook | API 配置 Hook
 */
export const useApiConfig = () => {
  const isConfigured = computed(() => !!apiKey.value)

  const setApiKey = (key) => {
    apiKey.value = key
  }

  const setBaseUrl = (url) => {
    baseUrl.value = url
  }
  
  const setProvider = (val) => {
    provider.value = val
  }
  
  const setCustomEndpoint = (key, val) => {
    customEndpoints.value[key] = val
  }
  
  const setSelectedModel = (val) => {
    selectedModel.value = val
  }

  const configure = (config) => {
    if (config.apiKey) setApiKey(config.apiKey)
    if (config.baseUrl) setBaseUrl(config.baseUrl)
  }

  const clear = () => {
    apiKey.value = ''
    baseUrl.value = DEFAULT_API_BASE_URL
    provider.value = 'custom'
    customEndpoints.value = { ...DEFAULT_ENDPOINTS }
    selectedModel.value = ''
    availableModels.value = []
  }

  return {
    apiKey,
    baseUrl,
    provider,
    endpoints: activeEndpoints,
    customEndpoints,
    isConfigured,
    selectedModel,
    availableModels,
    isFetchingModels,
    setApiKey,
    setBaseUrl,
    setProvider,
    setCustomEndpoint,
    setSelectedModel,
    fetchModels,
    configure,
    clear,
    getEndpoint
  }
}
