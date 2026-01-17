/**
 * Model Store | 模型状态管理
 * Manages model lists, classification, and availability
 */

import { ref, computed, watch } from 'vue'
import {
  TEXT_POLISHING_MODELS,
  TEXT_TO_IMAGE_MODELS,
  IMAGE_TO_IMAGE_MODELS,
  IMAGE_TO_VIDEO_MODELS,
  VIDEO_TO_VIDEO_MODELS,
  SEEDREAM_SIZE_OPTIONS,
  SEEDREAM_4K_SIZE_OPTIONS,
  SEEDREAM_QUALITY_OPTIONS,
  VIDEO_RATIO_LIST,
  VIDEO_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_DURATION
} from '@/config/models'

// --- State ---
const textPolishingModels = ref([...TEXT_POLISHING_MODELS])
const textToImageModels = ref([...TEXT_TO_IMAGE_MODELS])
const imageToImageModels = ref([...IMAGE_TO_IMAGE_MODELS])
const imageToVideoModels = ref([...IMAGE_TO_VIDEO_MODELS])
const videoToVideoModels = ref([...VIDEO_TO_VIDEO_MODELS])

const loading = ref(false)
const error = ref(null)

// --- Persistence Key ---
const CUSTOM_MODELS_KEY = 'custom_models_registry'

// --- Helper: Load Custom Models from Storage ---
const loadCustomModels = () => {
  try {
    const stored = localStorage.getItem(CUSTOM_MODELS_KEY)
    if (stored) {
      const customRegistry = JSON.parse(stored)
      // Merge custom models into lists
      // Format: { category: 'text-polishing', model: { key, label, ... } }
      customRegistry.forEach(item => {
        addModelToCategory(item.category, item.model, false)
      })
    }
  } catch (e) {
    console.error('Failed to load custom models', e)
  }
}

// --- Helper: Update Custom Model ---
const updateCustomModel = (category, originalKey, newModel) => {
  try {
    const stored = localStorage.getItem(CUSTOM_MODELS_KEY)
    let registry = stored ? JSON.parse(stored) : []
    
    // Find index of existing custom model
    const index = registry.findIndex(item => item.model.key === originalKey && item.category === category)
    
    if (index !== -1) {
      registry[index] = { category, model: newModel }
    } else {
      // If not found (maybe it was an official model being customized), add as new
      registry.push({ category, model: newModel })
    }
    
    localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(registry))
  } catch (e) { console.error(e) }
}

// --- Helper: Delete Custom Model ---
const deleteCustomModel = (category, modelKey) => {
  try {
    const stored = localStorage.getItem(CUSTOM_MODELS_KEY)
    if (!stored) return
    
    let registry = JSON.parse(stored)
    registry = registry.filter(item => !(item.model.key === modelKey && item.category === category))
    
    localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(registry))
  } catch (e) { console.error(e) }
}

// --- Helper: Get List Reference ---
const getListRef = (category) => {
  switch (category) {
    case 'text-polishing': return textPolishingModels
    case 'text-to-image': return textToImageModels
    case 'image-to-image': return imageToImageModels
    case 'image-to-video': return imageToVideoModels
    case 'video-to-video': return videoToVideoModels
    default: return null
  }
}

const normalizeModelForCategory = (category, model) => {
  if (category === 'text-to-image' || category === 'image-to-image') {
    const normalized = { ...model }
    const defaultParams = { ...(normalized.defaultParams || {}) }
    if (!defaultParams.size) defaultParams.size = DEFAULT_IMAGE_SIZE
    normalized.defaultParams = defaultParams
    if (!Array.isArray(normalized.sizes)) normalized.sizes = []
    return normalized
  }
  if (category === 'image-to-video' || category === 'video-to-video') {
    const normalized = { ...model }
    const defaultParams = { ...(normalized.defaultParams || {}) }
    if (!Array.isArray(normalized.ratios)) normalized.ratios = VIDEO_RATIO_LIST.map(r => r.key)
    if (!Array.isArray(normalized.durs)) normalized.durs = VIDEO_DURATION_OPTIONS
    if (!defaultParams.ratio) defaultParams.ratio = DEFAULT_VIDEO_RATIO
    if (!defaultParams.dur && !defaultParams.duration) defaultParams.dur = DEFAULT_VIDEO_DURATION
    normalized.defaultParams = defaultParams
    return normalized
  }
  return model
}

// --- Helper: Add Model to Category ---
const addModelToCategory = (category, model, save = true) => {
  const listRef = getListRef(category)
  if (!listRef) return

  const normalized = normalizeModelForCategory(category, model)

  // Check if exists
  if (!listRef.value.find(m => m.key === normalized.key)) {
    listRef.value.push(normalized)
    if (save) saveCustomModel(category, normalized)
  }
}

// --- Action: Update Model ---
export const updateModel = (category, originalKey, newModel) => {
  const listRef = getListRef(category)
  if (!listRef) return

  const index = listRef.value.findIndex(m => m.key === originalKey)
  if (index !== -1) {
    const merged = { ...listRef.value[index], ...newModel, isCustom: true }
    const updated = normalizeModelForCategory(category, merged)
    listRef.value[index] = updated
    updateCustomModel(category, originalKey, updated)
  }
}

// --- Action: Delete Model ---
export const deleteModel = (category, modelKey) => {
  const listRef = getListRef(category)
  if (!listRef) return

  const index = listRef.value.findIndex(m => m.key === modelKey)
  if (index !== -1) {
    listRef.value.splice(index, 1)
    deleteCustomModel(category, modelKey)
  }
}

// --- Helper: Save Custom Model ---
const saveCustomModel = (category, model) => {
  try {
    const stored = localStorage.getItem(CUSTOM_MODELS_KEY)
    const registry = stored ? JSON.parse(stored) : []
    // Check if already saved
    if (!registry.find(item => item.model.key === model.key && item.category === category)) {
      registry.push({ category, model })
      localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(registry))
    }
  } catch (e) { console.error(e) }
}

// --- Classification Logic ---
export const classifyAndMergeModels = (fetchedModels) => {
  if (!Array.isArray(fetchedModels)) return

  // Reset to officials first (optional, or just merge)
  // For now, we append new found models
  
  fetchedModels.forEach(fetched => {
    const key = fetched.id || fetched.value // OpenAI format uses 'id'
    
    // 1. Check if it's already an official model in any category
    const isOfficial = [
      ...TEXT_POLISHING_MODELS,
      ...TEXT_TO_IMAGE_MODELS,
      ...IMAGE_TO_VIDEO_MODELS // and others...
    ].some(m => m.key === key)

    if (isOfficial) return // Already have it with full specs

    // 2. Heuristic Classification
    let category = 'text-polishing' // Default
    const lowerKey = key.toLowerCase()

    if (lowerKey.includes('gpt') || lowerKey.includes('claude') || lowerKey.includes('deepseek') || lowerKey.includes('gemini') || lowerKey.includes('llama') || lowerKey.includes('qwen')) {
      category = 'text-polishing'
    } else if (lowerKey.includes('sd') || lowerKey.includes('diffusion') || lowerKey.includes('dall') || lowerKey.includes('midjourney') || lowerKey.includes('flux') || lowerKey.includes('mj')) {
      category = 'text-to-image'
    } else if (lowerKey.includes('svd') || lowerKey.includes('sora') || lowerKey.includes('luma') || lowerKey.includes('kling') || lowerKey.includes('video') || lowerKey.includes('runway')) {
      category = 'image-to-video'
    }

    // 3. Create Model Object
    const newModel = {
      label: key, // Use key as label for unknown models
      key: key,
      isCustom: true,
      // Add default specs based on category
      ...(category === 'text-to-image' ? { sizes: [], defaultParams: { size: '1024x1024' } } : {}),
      ...(category === 'image-to-video' ? { ratios: VIDEO_RATIO_LIST.map(r => r.key), durs: [{label:'5s', key:5}], defaultParams: { ratio: '16:9', dur: 5 } } : {})
    }

    // 4. Add to lists
    addModelToCategory(category, newModel, false) // Don't persist auto-fetched models to avoid cluttering local storage, only session
    
    // Also add to I2I if T2I
    if (category === 'text-to-image') {
      addModelToCategory('image-to-image', newModel, false)
    }
    // Also add to V2V if I2V
    if (category === 'image-to-video') {
      addModelToCategory('video-to-video', newModel, false)
    }
  })
}

// --- Initialization ---
loadCustomModels()


/**
 * Get model config by name
 */
export const getModelConfig = (modelKey) => {
  const allModels = [
    ...textPolishingModels.value,
    ...textToImageModels.value,
    ...imageToImageModels.value,
    ...imageToVideoModels.value,
    ...videoToVideoModels.value
  ]
  return allModels.find(m => m.key === modelKey)
}

/**
/**
 * Get size options for image model | 获取图片模型尺寸选项
 * Returns options based on model's sizes array and quality
 */
export const getModelSizeOptions = (modelKey, quality = 'standard') => {
  const model = textToImageModels.value.find(m => m.key === modelKey) || imageToImageModels.value.find(m => m.key === modelKey)
  
  // If model has getSizesByQuality function, use it | 如果模型有 getSizesByQuality 函数，使用它
  if (model?.getSizesByQuality) {
    return model.getSizesByQuality(quality)
  }
  
  if (!model?.sizes || model.sizes.length === 0) return SEEDREAM_SIZE_OPTIONS
  
  const allSizeOptions = [...SEEDREAM_SIZE_OPTIONS, ...SEEDREAM_4K_SIZE_OPTIONS]
  
  return model.sizes.map(size => {
    const option = allSizeOptions.find(o => o.key === size)
    return option || { label: size, key: size }
  })
}

/**
 * Get quality options for image model | 获取图片模型画质选项
 */
export const getModelQualityOptions = (modelKey) => {
  const model = textToImageModels.value.find(m => m.key === modelKey) || imageToImageModels.value.find(m => m.key === modelKey)
  return model?.qualities || []
}

/**
 * Get ratio options for video model | 获取视频模型比例选项
 * Returns options based on model's ratios array
 */
export const getModelRatioOptions = (modelKey) => {
  const model = imageToVideoModels.value.find(m => m.key === modelKey) || videoToVideoModels.value.find(m => m.key === modelKey)
  if (!model?.ratios || model.ratios.length === 0) return VIDEO_RATIO_OPTIONS
  
  return model.ratios.map(ratio => {
    const option = VIDEO_RATIO_LIST.find(o => o.key === ratio)
    return option || { label: ratio, key: ratio }
  })
}

/**
 * Get duration options for video model
 */
export const getModelDurationOptions = (modelKey) => {
  const model = imageToVideoModels.value.find(m => m.key === modelKey) || videoToVideoModels.value.find(m => m.key === modelKey)
  if (!model?.durs || model.durs.length === 0) return VIDEO_DURATION_OPTIONS
  return model.durs
}

// --- Exports ---

// Options for Dropdowns
export const textPolishingOptions = computed(() => textPolishingModels.value)
export const textToImageOptions = computed(() => textToImageModels.value)
export const imageToImageOptions = computed(() => imageToImageModels.value)
export const imageToVideoOptions = computed(() => imageToVideoModels.value)
export const videoToVideoOptions = computed(() => videoToVideoModels.value)

// Legacy Exports (Mapped)
export const imageModelOptions = textToImageOptions
export const videoModelOptions = imageToVideoOptions
export const chatModelOptions = textPolishingOptions

export const imageModels = textToImageModels
export const videoModels = imageToVideoModels
export const chatModels = textPolishingModels

export const loadAllModels = async () => {
  return [
    ...textPolishingModels.value,
    ...textToImageModels.value,
    ...imageToImageModels.value,
    ...imageToVideoModels.value,
    ...videoToVideoModels.value
  ]
}

export {
  loading,
  error,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_DURATION,
  SEEDREAM_SIZE_OPTIONS,
  SEEDREAM_4K_SIZE_OPTIONS,
  SEEDREAM_QUALITY_OPTIONS,
  VIDEO_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  addModelToCategory
}
