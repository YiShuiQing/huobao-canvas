/**
 * Model Store | 模型状态管理
 * 加载所有模型，按类型和厂商组织
 */

import { ref, computed } from 'vue'
import { getModelPage, getModelByFullName } from '@/api'
import { parseModelSchema, extractFormConfig } from '@/utils'

// All models | 所有模型
const allModels = ref([])

// Models by type | 按类型分类的模型
const imageModels = ref([])
const videoModels = ref([])
const chatModels = ref([])

// Models organized by factory | 按厂商组织的模型
const imageModelsByFactory = ref([])
const videoModelsByFactory = ref([])
const chatModelsByFactory = ref([])

// Model schema cache | 模型 schema 缓存
const modelSchemaCache = ref({})

// Loading state | 加载状态
const loading = ref(false)
const error = ref(null)

/**
 * Organize models by factory | 按厂商组织模型
 * @param {Array} models - Model list
 * @returns {Array} Factory grouped models
 */
const organizeByFactory = (models) => {
  const factoryMap = {}
  models.forEach(model => {
    const factory = model.factory || '其他'
    if (!factoryMap[factory]) {
      factoryMap[factory] = []
    }
    factoryMap[factory].push(model)
  })
  
  return Object.entries(factoryMap).map(([name, models]) => ({
    name,
    models
  }))
}

/**
 * Load all models | 加载所有模型
 */
export const loadAllModels = async () => {
  loading.value = true
  error.value = null
  
  try {
    const rsp = await getModelPage({
      enable: true,
      size: 1000,
      current: 1
    })
    const models = rsp.data?.records || []
    allModels.value = models
    
    // Filter by type | 按类型过滤
    imageModels.value = models.filter(m => m.typeName === '图片')
    videoModels.value = models.filter(m => m.typeName === '视频')
    chatModels.value = models.filter(m => m.typeName === '对话')
    
    // Organize by factory | 按厂商组织
    imageModelsByFactory.value = organizeByFactory(imageModels.value)
    videoModelsByFactory.value = organizeByFactory(videoModels.value)
    chatModelsByFactory.value = organizeByFactory(chatModels.value)
    
    return models
  } catch (err) {
    console.error('Load models error:', err)
    error.value = err.message
    return []
  } finally {
    loading.value = false
  }
}

/**
 * Load image models | 加载图片模型
 */
export const loadImageModels = async () => {
  if (imageModels.value.length > 0) return imageModels.value
  await loadAllModels()
  return imageModels.value
}

/**
 * Load video models | 加载视频模型
 */
export const loadVideoModels = async () => {
  if (videoModels.value.length > 0) return videoModels.value
  await loadAllModels()
  return videoModels.value
}

/**
 * Get model schema | 获取模型 schema
 */
export const getModelSchema = async (modelName) => {
  if (modelSchemaCache.value[modelName]) {
    return modelSchemaCache.value[modelName]
  }

  try {
    const res = await getModelByFullName(modelName)
    const modelData = res.data
    if (!modelData) return null

    const schema = parseModelSchema(modelData.modelSchema)
    const result = {
      model: modelName,
      displayName: modelData.displayName || modelData.name || modelName,
      description: modelData.description || '',
      typeName: modelData.typeName || '',
      endpoint: modelData.endpoint || '',
      inputFields: schema.input,
      inputTransform: schema.inputTransform,  // Input transform template
      requestType: schema.requestType,        // 'json' or 'formdata'
      asyncMode: schema.asyncMode,            // 'auto', 'sync', 'async'
      output: schema.output                   // Output schema for result parsing
    }

    modelSchemaCache.value[modelName] = result
    return result
  } catch (err) {
    console.error(`Get model schema error for ${modelName}:`, err)
    return null
  }
}

// Cascader options for image models (factory -> model) | 图片模型级联选项
export const imageCascaderOptions = computed(() => {
  return imageModelsByFactory.value.map(factory => ({
    label: factory.name,
    value: `factory_${factory.name}`,
    children: factory.models.map(model => ({
      label: model.displayName || model.name,
      value: model.name
    }))
  }))
})

// Cascader options for video models (factory -> model) | 视频模型级联选项
export const videoCascaderOptions = computed(() => {
  return videoModelsByFactory.value.map(factory => ({
    label: factory.name,
    value: `factory_${factory.name}`,
    children: factory.models.map(model => ({
      label: model.displayName || model.name,
      value: model.name
    }))
  }))
})

// Cascader options for chat models (factory -> model) | 问答模型级联选项
export const chatCascaderOptions = computed(() => {
  return chatModelsByFactory.value.map(factory => ({
    label: factory.name,
    value: `factory_${factory.name}`,
    children: factory.models.map(model => ({
      label: model.displayName || model.name,
      value: model.name
    }))
  }))
})

// Flat options for dropdowns | 下拉选项（平铺）
export const imageModelOptions = computed(() => {
  return imageModels.value.map(m => ({
    label: m.displayName || m.name,
    key: m.name
  }))
})

export const videoModelOptions = computed(() => {
  return videoModels.value.map(m => ({
    label: m.displayName || m.name,
    key: m.name
  }))
})

// Re-export from utils | 从 utils 重新导出
export { extractFormConfig }

// Export refs | 导出响应式引用
export { 
  allModels, 
  imageModels, 
  videoModels, 
  chatModels,
  imageModelsByFactory,
  videoModelsByFactory,
  chatModelsByFactory,
  modelSchemaCache, 
  loading, 
  error 
}
