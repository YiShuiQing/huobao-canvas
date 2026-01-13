<template>
  <!-- Image config node wrapper for hover area | 文生图配置节点包裹层，扩展悬浮区域 -->
  <div class="image-config-node-wrapper" @mouseenter="showActions = true" @mouseleave="showActions = false">
    <!-- Image config node | 文生图配置节点 -->
    <div
      class="image-config-node bg-[var(--bg-secondary)] rounded-xl border min-w-[300px] transition-all duration-200"
      :class="data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]'">
      <!-- Header | 头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
        <span class="text-sm font-medium text-[var(--text-secondary)]">{{ data.label }}</span>
        <div class="flex items-center gap-1">
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            <n-icon :size="14">
              <TrashOutline />
            </n-icon>
          </button>
          <n-dropdown :options="modelOptions" @select="handleModelSelect">
            <button class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
              <n-icon :size="14">
                <ChevronDownOutline />
              </n-icon>
            </button>
          </n-dropdown>
        </div>
      </div>

      <!-- Config options | 配置选项 -->
      <div class="p-3 space-y-3">
        <!-- Model selector with cascader | 模型级联选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">模型</span>
          <n-cascader v-model:value="cascaderValue" :options="imageCascaderOptions" :show-path="false"
            placeholder="选择模型" size="small" style="max-width: 200px" @update:value="handleCascaderChange" />
        </div>

        <!-- Size selector | 尺寸选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">尺寸</span>
          <div class="flex items-center gap-2">
            <n-dropdown :options="sizeOptions" @select="handleSizeSelect">
              <button
                class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
                {{ localSize }}
                <n-icon :size="12">
                  <ChevronForwardOutline />
                </n-icon>
              </button>
            </n-dropdown>
            <input v-model="localSize" @blur="updateSize" @mousedown.stop placeholder="自定义尺寸"
              class="w-24 px-2 py-1 text-xs bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)]" />
          </div>
        </div>

        <!-- Connected inputs indicator | 连接输入指示 -->
        <div
          class="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-1 border-t border-[var(--border-color)]">
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedPrompt ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            提示词 {{ connectedPrompt ? '✓' : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedRefImages.length > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考图 {{ connectedRefImages.length > 0 ? `${connectedRefImages.length}张` : '○' }}
          </span>
        </div>

        <!-- Generate button | 生成按钮 -->
        <button @click="handleGenerate" :disabled="loading || !isConfigured"
          class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <n-spin v-if="loading" :size="14" />
          <template v-else>
            <span
              class="text-[var(--accent-color)] bg-white rounded-full w-4 h-4 flex items-center justify-center text-xs">◆</span>
            立即生成
          </template>
        </button>

        <!-- Error message | 错误信息 -->
        <div v-if="error" class="text-xs text-red-500 mt-2">
          {{ error.message || '生成失败' }}
        </div>

        <!-- Generated images preview | 生成图片预览 -->
        <!-- <div v-if="generatedImages.length > 0" class="mt-3 space-y-2">
        <div class="text-xs text-[var(--text-secondary)]">生成结果:</div>
        <div class="grid grid-cols-2 gap-2 max-w-[240px]">
          <div 
            v-for="(img, idx) in generatedImages" 
            :key="idx"
            class="aspect-square rounded-lg overflow-hidden bg-[var(--bg-tertiary)] max-w-[110px]"
          >
            <img :src="img.url" class="w-full h-full object-cover" />
          </div>
        </div>
      </div> -->
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
      <Handle type="source" :position="Position.Right" id="right" class="!bg-[var(--accent-color)]" />
    </div>

    <!-- Hover action buttons | 悬浮操作按钮 -->
    <!-- Top right - Copy button | 右上角 - 复制按钮 -->
    <div v-show="showActions" class="absolute -top-5 right-0 z-[1000]">
      <button @click="handleDuplicate"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5">
        <n-icon :size="16" class="text-gray-600">
          <CopyOutline />
        </n-icon>
        <span
          class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[60px] transition-all duration-200 whitespace-nowrap">复制</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Image config node component | 文生图配置节点组件
 * Configuration panel for text-to-image generation with API integration
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin, NCascader } from 'naive-ui'
import { ChevronDownOutline, ChevronForwardOutline, CopyOutline, TrashOutline } from '@vicons/ionicons5'
import { useImageGeneration, useApiConfig } from '../../hooks'
import { updateNode, addNode, addEdge, nodes, edges, duplicateNode, removeNode } from '../../stores/canvas'
import {
  imageModels,
  imageModelOptions,
  imageCascaderOptions,
  getModelSchema,
  extractFormConfig
} from '../../stores/models'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// API config hook | API 配置 hook
const { isConfigured } = useApiConfig()

// Image generation hook | 图片生成 hook
const { loading, error, images: generatedImages, generate } = useImageGeneration()

// Hover state | 悬浮状态
const showActions = ref(false)

// Local state | 本地状态
const localModel = ref(props.data?.model || '')
const localSize = ref(props.data?.size || '1024x1024')

// Current model schema config | 当前模型 schema 配置
const modelSchema = ref(null)
const formConfig = ref({ sizeOptions: [], hasRefImage: false, hasRefImages: false })

// Default size options (fallback) | 默认尺寸选项（回退）
const defaultSizeOptions = [
  { label: '512x512', key: '512x512' },
  { label: '1024x1024', key: '1024x1024' },
  { label: '2048x2048', key: '2048x2048' },
  { label: '1024x1792 (竖版)', key: '1024x1792' },
  { label: '1792x1024 (横版)', key: '1792x1024' }
]

// Model options from store | 从 store 获取模型选项
const modelOptions = computed(() => {
  if (imageModelOptions.value.length > 0) {
    return imageModelOptions.value
  }
  // Fallback options | 回退选项
  return [
    { label: '豆包 Seedream', key: 'doubao-seedream-4-5-251128' },
    { label: 'DALL-E 3', key: 'dall-e-3' },
    { label: 'Flux Pro', key: 'flux-pro' }
  ]
})

// Display model name | 显示模型名称
const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.key === localModel.value)
  return model?.label || localModel.value || '选择模型'
})

// Size options from schema or default | 从 schema 或默认获取尺寸选项
const sizeOptions = computed(() => {
  if (formConfig.value.sizeOptions?.length > 0) {
    return formConfig.value.sizeOptions
  }
  return defaultSizeOptions
})

// Load model schema when model changes | 模型变更时加载 schema
const loadModelSchema = async (modelName) => {
  if (!modelName) return

  const schema = await getModelSchema(modelName)
  if (schema) {
    modelSchema.value = schema
    formConfig.value = extractFormConfig(schema.inputFields)

    // Update size if current size not in options | 如果当前尺寸不在选项中则更新
    if (formConfig.value.sizeOptions?.length > 0) {
      const validSize = formConfig.value.sizeOptions.find(s => s.key === localSize.value)
      if (!validSize) {
        localSize.value = formConfig.value.sizeOptions[0].key
        updateNode(props.id, { size: localSize.value })
      }
    }
  }
}

// Cascader value | 级联选择器值
const cascaderValue = ref(null)

// Handle cascader change | 处理级联选择器变化
const handleCascaderChange = async (value, option, pathValues) => {
  // value is the model name (last level) | value 是模型名称（最后一级）
  if (value && !value.startsWith('factory_')) {
    localModel.value = value
    updateNode(props.id, { model: value })
    await loadModelSchema(value)
  }
}

// Initialize on mount | 挂载时初始化
onMounted(async () => {
  // Set default model if not set | 如果未设置则设置默认模型
  if (!localModel.value && imageModels.value.length > 0) {
    localModel.value = imageModels.value[0].name
    // updateNode(props.id, { model: localModel.value })
  }

  // Set cascader value | 设置级联选择器值
  if (localModel.value) {
    cascaderValue.value = localModel.value
  }

  // Load schema for current model | 加载当前模型的 schema
  if (localModel.value) {
    // await loadModelSchema(localModel.value)
  }
})

// Get connected nodes | 获取连接的节点
const getConnectedInputs = () => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  let prompt = ''
  const refImages = []

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'text') {
      prompt = sourceNode.data?.content || ''
    } else if (sourceNode.type === 'image') {
      // Prefer base64, fallback to url | 优先使用 base64，回退到 url
      const imageData = sourceNode.data?.base64 || sourceNode.data?.url
      if (imageData) {
        refImages.push(imageData)
      }
    }
  }

  return { prompt, refImages }
}

// Computed connected prompt | 计算连接的提示词
const connectedPrompt = computed(() => {
  return getConnectedInputs().prompt
})

// Computed connected reference images | 计算连接的参考图
const connectedRefImages = computed(() => {
  return getConnectedInputs().refImages
})

// Handle model selection | 处理模型选择
const handleModelSelect = async (key) => {
  localModel.value = key
  updateNode(props.id, { model: key })
  // Reload schema for new model | 重新加载新模型的 schema
  await loadModelSchema(key)
}

// Handle size selection | 处理尺寸选择
const handleSizeSelect = (size) => {
  localSize.value = size
  updateNode(props.id, { size })
}

// Update size from manual input | 更新手动输入的尺寸
const updateSize = () => {
  updateNode(props.id, { size: localSize.value })
}

// Created image node ID | 创建的图片节点 ID
const createdImageNodeId = ref(null)

// Handle generate action | 处理生成操作
const handleGenerate = async () => {
  const { prompt, refImages } = getConnectedInputs()

  if (!prompt && refImages.length === 0) {
    window.$message?.warning('请连接文本节点（提示词）或图片节点（参考图）')
    return
  }

  if (!isConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }

  // Get current node position | 获取当前节点位置
  debugger
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create image node with loading state | 创建带加载状态的图片节点
  const imageNodeId = addNode('image', { x: nodeX + 400, y: nodeY }, {
    url: '',
    loading: true,
    label: '图像生成结果'
  })
  createdImageNodeId.value = imageNodeId

  // Auto-connect imageConfig → image | 自动连接 生图配置 → 图片
  addEdge({
    source: props.id,
    target: imageNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(imageNodeId)
  }, 50)

  try {
    // Build request params (raw form data) | 构建请求参数（原始表单数据）
    const params = {
      model: localModel.value,
      size: localSize.value,
      // n: 1
    }

    // Add prompt if provided | 如果有提示词则添加
    if (prompt) {
      params.prompt = prompt
    }

    // Add reference images if provided | 如果有参考图则添加
    if (refImages.length > 0) {
      params.image = refImages[0] // Single reference image | 单张参考图
      params.images = refImages   // Multiple reference images | 多张参考图
    }

    // Get full schema config for request building | 获取完整 schema 配置用于请求构建
    const schemaConfig = modelSchema.value ? {
      inputTransform: modelSchema.value.inputTransform,
      requestType: modelSchema.value.requestType,
      asyncMode: modelSchema.value.asyncMode,
      endpoint: modelSchema.value.endpoint,
      output: modelSchema.value.output,
      typeName: modelSchema.value.typeName
    } : null

    const result = await generate(params, schemaConfig)

    // Update image node with generated URL | 更新图片节点 URL
    if (result && result.length > 0) {
      updateNode(imageNodeId, {
        url: result[0].url,
        loading: false,
        label: '文生图',
        model: localModel.value,
        updatedAt: Date.now()
      })
    }
    window.$message?.success('图片生成成功')
  } catch (err) {
    // Update node to show error | 更新节点显示错误
    updateNode(imageNodeId, {
      loading: false,
      error: err.message || '生成失败',
      updatedAt: Date.now()
    })
    window.$message?.error(err.message || '图片生成失败')
  }
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newNodeId = duplicateNode(props.id)
  window.$message?.success('节点已复制')
  if (newNodeId) {
    setTimeout(() => {
      updateNodeInternals(newNodeId)
    }, 50)
  }
}

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
  window.$message?.success('节点已删除')
}
</script>

<style scoped>
.image-config-node-wrapper {
  position: relative;
  padding-top: 20px;
}

.image-config-node {
  cursor: default;
  position: relative;
}
</style>
