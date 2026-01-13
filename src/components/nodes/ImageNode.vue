<template>
  <!-- Image node wrapper for hover area | 图片节点包裹层，扩展悬浮区域 -->
  <div class="image-node-wrapper" @mouseenter="showActions = true" @mouseleave="showActions = false">
    <!-- Image node | 图片节点 -->
    <div
      class="image-node bg-[var(--bg-secondary)] rounded-xl border min-w-[200px] max-w-[280px] relative transition-all duration-200"
      :class="data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]'">
      <!-- Header | 头部 -->
      <div class="px-3 py-2 border-b border-[var(--border-color)]">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-[var(--text-primary)]">{{ data.label || '图像生成结果' }}</span>
          <div class="flex items-center gap-1">
            <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
              <n-icon :size="14">
                <TrashOutline />
              </n-icon>
            </button>
            <button class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
              <n-icon :size="14">
                <ExpandOutline />
              </n-icon>
            </button>
          </div>
        </div>
        <!-- Model name | 模型名称 -->
        <div v-if="data.model" class="mt-1 text-xs text-[var(--text-secondary)] truncate">
          {{ data.model }}
        </div>
      </div>

      <!-- Image preview area | 图片预览区域 -->
      <div class="p-3">
        <!-- Loading state | 加载状态 -->
        <div v-if="data.loading"
          class="aspect-square rounded-xl bg-gradient-to-br from-cyan-400 via-blue-300 to-amber-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
          <!-- Animated gradient overlay | 动画渐变遮罩 -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-400/20 to-amber-300/20 animate-pulse">
          </div>

          <!-- Loading image | 加载图片 -->
          <div class="relative z-10">
            <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
          </div>

          <span class="text-sm text-white font-medium relative z-10">创作中</span>
        </div>

        <!-- Error state | 错误状态 -->
        <div v-else-if="data.error"
          class="aspect-square rounded-xl bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-2 border border-red-200 dark:border-red-800">
          <n-icon :size="32" class="text-red-500">
            <CloseCircleOutline />
          </n-icon>
          <span class="text-sm text-red-600 dark:text-red-400 text-center px-2">{{ data.error }}</span>
        </div>

        <!-- Image display | 图片显示 -->
        <div v-else-if="data.url" class="rounded-xl overflow-hidden">
          <img :src="data.url" :alt="data.label" class="w-full h-auto object-cover" />
        </div>

        <!-- Upload placeholder | 上传占位 -->
        <div v-else
          class="aspect-square rounded-xl bg-[var(--bg-tertiary)] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-color)] relative">
          <n-icon :size="32" class="text-[var(--text-secondary)]">
            <ImageOutline />
          </n-icon>
          <span class="text-sm text-[var(--text-secondary)] text-center">拖放图片或点击上传</span>
          <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer"
            @change="handleFileUpload" />
        </div>
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="source" :position="Position.Right" id="right" class="!bg-[var(--accent-color)]" />
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
    </div>

    <!-- Hover action buttons | 悬浮操作按钮 -->
    <!-- Top right - Copy button | 右上角 - 复制按钮 -->
    <div v-show="showActions" class="absolute -top-5 right-12 z-[1000]">
      <button @click="handleDuplicate"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5  w-max">
        <n-icon :size="16" class="text-gray-600">
          <CopyOutline />
        </n-icon>
        <span
          class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[60px] transition-all duration-200 whitespace-nowrap">复制</span>
      </button>
    </div>

    <!-- Right side - Action buttons | 右侧 - 操作按钮 -->
    <div v-show="showActions && data.url"
      class="absolute right-10 top-1/2 -translate-y-1/2 translate-x-full flex flex-col gap-2 z-[1000]">
      <!-- Image generation button | 图片生图按钮 -->
      <button @click="handleImageGen"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5  w-max">
        <n-icon :size="16" class="text-gray-600">
          <ImageOutline />
        </n-icon>
        <span
          class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">图片生图</span>
      </button>
      <!-- Preview button | 预览按钮 -->
      <button @click="handlePreview"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5 w-max">
        <n-icon :size="16" class="text-gray-600">
          <EyeOutline />
        </n-icon>
        <span
          class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">预览</span>
      </button>
      <!-- Download button | 下载按钮 -->
      <button @click="handleDownload"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5  w-max">
        <n-icon :size="16" class="text-gray-600">
          <DownloadOutline />
        </n-icon>
        <span
          class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">下载</span>
      </button>
      <!-- Video generation button | 视频生成按钮 -->
      <button @click="handleVideoGen"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5  w-max">
        <n-icon :size="16" class="text-gray-600">
          <VideocamOutline />
        </n-icon>
        <span
          class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">视频生成</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Image node component | 图片节点组件
 * Displays and manages image content with loading state
 */
import { ref, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon } from 'naive-ui'
import { TrashOutline, ExpandOutline, ImageOutline, CloseCircleOutline, CopyOutline, VideocamOutline, DownloadOutline, EyeOutline } from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, nodes } from '../../stores/canvas'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// Hover state | 悬浮状态
const showActions = ref(true)

// Convert file to base64 | 将文件转换为 base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Handle file upload | 处理文件上传
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      // Convert to base64 | 转换为 base64
      const base64 = await fileToBase64(file)
      // Store both display URL and base64 | 同时存储显示 URL 和 base64
      updateNode(props.id, {
        url: base64,  // Use base64 as display URL | 使用 base64 作为显示 URL
        base64: base64,  // Store base64 for API calls | 存储 base64 用于 API 调用
        fileName: file.name,
        fileType: file.type,
        label: '参考图',
        updatedAt: Date.now()
      })
    } catch (err) {
      console.error('File upload error:', err)
      window.$message?.error('图片上传失败')
    }
  }
}

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  if (newId) {
    // Clear selection and select the new node | 清除选中并选中新节点
    updateNode(props.id, { selected: false })
    updateNode(newId, { selected: true })
    window.$message?.success('节点已复制')
    setTimeout(() => {
      updateNodeInternals(newId)
    }, 50)
  }
}

// Handle image generation | 处理图片生图
const handleImageGen = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create text node for prompt | 创建文本节点用于提示词
  const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
    content: '请输入提示词...',
    label: '提示词'
  })

  // Create imageConfig node | 创建文生图配置节点
  const configNodeId = addNode('imageConfig', { x: nodeX + 600, y: nodeY }, {
    model: 'doubao-seedream-4-5-251128',
    size: '1024x1024',
    label: '图生图'
  })

  // Connect image node to config node | 连接图片节点到配置节点
  addEdge({
    source: props.id,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Connect text node to config node | 连接文本节点到配置节点
  addEdge({
    source: textNodeId,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals([textNodeId, configNodeId])
  }, 50)
}

// Handle preview | 处理预览
const handlePreview = () => {
  if (props.data.url) {
    window.open(props.data.url, '_blank')
  }
}

// Handle download | 处理下载
const handleDownload = () => {
  if (props.data.url) {
    const link = document.createElement('a')
    link.href = props.data.url
    link.download = props.data.fileName || `image_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.$message?.success('图片下载中...')
  }
}

// Handle video generation | 处理视频生成
const handleVideoGen = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create text node for prompt | 创建文本节点用于提示词
  const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
    content: '请输入提示词...',
    label: '提示词'
  })

  // Create videoConfig node | 创建视频配置节点
  const configNodeId = addNode('videoConfig', { x: nodeX + 600, y: nodeY }, {
    label: '视频生成'
  })

  // Connect image node to config node with role | 连接图片节点到配置节点并设置角色
  addEdge({
    source: props.id,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'imageRole',
    data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
  })

  // Connect text node to config node | 连接文本节点到配置节点
  addEdge({
    source: textNodeId,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals([textNodeId, configNodeId])
  }, 50)
}
</script>

<style scoped>
.image-node-wrapper {
  position: relative;
  padding-right: 50px;
  padding-top: 20px;
}

.image-node {
  cursor: default;
  position: relative;
}
</style>
