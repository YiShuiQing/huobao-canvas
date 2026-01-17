<template>
  <!-- API Settings Modal | API 设置弹窗 -->
  <n-modal v-model:show="showModal" preset="card" title="API 设置" style="width: 560px;">
    <template #header-extra>
       <n-button text size="small" @click="modelSettingsRef?.open()">
         <template #icon><n-icon><SettingsOutline /></n-icon></template>
         模型配置
       </n-button>
    </template>
    <n-alert 
        v-if="formStatus.show" 
        :type="formStatus.type" 
        :title="formStatus.title" 
        class="mb-4 status-alert"
        :class="formStatus.class"
      >
        <template #icon>
          <n-icon size="20">
            <component :is="formStatus.icon" />
          </n-icon>
        </template>
        {{ formStatus.content }}
      </n-alert>

      <n-form 
        ref="formRef" 
        :model="formData" 
        :rules="rules"
        label-placement="left" 
        label-width="100"
        require-mark-placement="right-hanging"
      >
        
        <n-form-item label="服务提供商" path="provider">
        <n-select 
          v-model:value="formData.provider" 
          :options="providerOptions" 
          placeholder="请选择服务提供商"
        />
      </n-form-item>

      <n-form-item label="Base URL" path="baseUrl">
        <n-input 
          v-model:value="formData.baseUrl" 
          :disabled="formData.provider !== 'custom'"
          placeholder="https://api.example.com/v1"
        >
          <template #suffix v-if="formData.provider !== 'custom'">
             <span class="text-xs text-gray-400">预设</span>
          </template>
        </n-input>
      </n-form-item>

      <n-form-item label="API Key" path="apiKey">
        <n-input 
          v-model:value="formData.apiKey" 
          type="password"
          show-password-on="click"
          placeholder="请输入 API Key"
        />
      </n-form-item>

      <!-- 模型配置 -->
      <n-divider title-placement="left" class="!my-3">
        <span class="text-xs text-[var(--text-secondary)]">模型配置 (Model)</span>
      </n-divider>

      <n-form-item label="模型选择" path="model" :show-label="false">
        <div class="flex gap-2 w-full">
          <n-select
            v-model:value="formData.model"
            filterable
            tag
            :options="modelOptions"
            placeholder="选择或输入模型名称"
            :loading="isFetchingModels"
            class="flex-1"
          >
             <template #action>
               <div class="p-2 text-xs text-gray-500">
                 支持手动输入新模型名称
               </div>
             </template>
          </n-select>
          <n-button 
            secondary 
            type="primary" 
            @click="handleFetchModels" 
            :loading="isFetchingModels"
            :disabled="!formData.apiKey || !formData.baseUrl"
          >
            获取列表
          </n-button>
        </div>
      </n-form-item>

      <!-- 三方渠道端点配置 -->
      <n-collapse arrow-placement="right" class="mb-4">
        <n-collapse-item title="高级设置：端点路径 (Endpoints)">
           <template #header-extra>
             <span class="text-xs text-gray-400">默认配置通常无需修改</span>
           </template>
           
          <div class="flex flex-col gap-3 mt-2">
            <div v-for="(label, key) in endpointLabels" :key="key" class="flex items-center gap-2">
               <span class="w-24 text-xs text-gray-500 shrink-0 text-right">{{ label }}</span>
               <n-input v-model:value="formData.endpoints[key]" size="small" :placeholder="`/${key}...`" />
            </div>
          </div>
        </n-collapse-item>
      </n-collapse>

      <!-- Test Connection -->
      <div class="flex justify-between items-center mb-4 p-3 bg-[var(--bg-secondary)] rounded-md">
          <div class="text-xs text-gray-500">
             测试模型: <span class="font-mono font-bold">{{ formData.model || '未选择' }}</span>
          </div>
          <n-button size="small" @click="handleTestConnection" :loading="testing" secondary type="primary">
             ⚡ 测试连接
          </n-button>
      </div>

      <n-alert v-if="testResult" :type="testResult.type" :title="testResult.title" closable class="mb-4">
          <div class="whitespace-pre-wrap text-xs">{{ testResult.message }}</div>
          <div v-if="testResult.details" class="mt-2 p-2 bg-black/5 rounded font-mono text-[10px] break-all">
             {{ testResult.details }}
          </div>
      </n-alert>
    </n-form>

    <template #footer>
      <div class="flex justify-between items-center">
        <a 
          href="https://api.chatfire.site/login?inviteCode=EEE80324" 
          target="_blank"
          class="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors"
        >
          没有 API Key？点击注册
        </a>
        <div class="flex gap-2">
          <n-button @click="handleClear" tertiary>清除配置</n-button>
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="handleSave" :disabled="!isFormValid">保存</n-button>
        </div>
      </div>
    </template>
  </n-modal>
  <ModelSettings ref="modelSettingsRef" />
</template>

<style scoped>
.status-alert :deep(.n-alert-body__title) {
  font-weight: bold;
}

/* Success: Green bg + White text */
.status-alert.status-success {
  background-color: #10b981 !important; /* Tailwind green-500 */
  color: white !important;
  border: none;
}
.status-alert.status-success :deep(.n-alert-body__title),
.status-alert.status-success :deep(.n-alert-body__content),
.status-alert.status-success :deep(.n-icon) {
  color: white !important;
}

/* Error: Red bg + White text */
.status-alert.status-error {
  background-color: #ef4444 !important; /* Tailwind red-500 */
  color: white !important;
  border: none;
}
.status-alert.status-error :deep(.n-alert-body__title),
.status-alert.status-error :deep(.n-alert-body__content),
.status-alert.status-error :deep(.n-icon) {
  color: white !important;
}

/* Warning: Yellow bg + Black text */
.status-alert.status-warning {
  background-color: #fbbf24 !important; /* Tailwind amber-400 */
  color: black !important;
  border: none;
}
.status-alert.status-warning :deep(.n-alert-body__title),
.status-alert.status-warning :deep(.n-alert-body__content),
.status-alert.status-warning :deep(.n-icon) {
  color: black !important;
}
</style>

<script setup>
/**
 * API Settings Component | API 设置组件
 * Modal for configuring API key and base URL
 */
import { ref, reactive, watch, computed } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NAlert, NDivider, NTag, NSelect, NCollapse, NCollapseItem, useMessage, NIcon } from 'naive-ui'
import { CheckmarkCircle, Warning, AlertCircle, SettingsOutline } from '@vicons/ionicons5'
import { useApiConfig } from '../hooks'
import { PROVIDERS, getProvider } from '@/config/providers'
import ModelSettings from './ModelSettings.vue'

// Props | 属性
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

// Emits | 事件
const emit = defineEmits(['update:show', 'saved'])
const message = useMessage()
const formRef = ref(null)
const modelSettingsRef = ref(null)

// API Config hook | API 配置 hook
const { 
  apiKey, baseUrl, provider, endpoints, customEndpoints, selectedModel, availableModels, isFetchingModels,
  isConfigured, setApiKey, setBaseUrl, setProvider, setCustomEndpoint, setSelectedModel, fetchModels, clear: clearConfig 
} = useApiConfig()

// Validation Rules | 验证规则
const rules = {
  provider: { required: true, message: '请选择服务提供商', trigger: ['blur', 'change'] },
  baseUrl: { 
    required: true, 
    message: '请输入有效的 Base URL', 
    trigger: ['blur', 'input'],
    validator: (rule, value) => {
      if (!value) return new Error('请输入 Base URL')
      if (!/^https?:\/\/.+/.test(value)) return new Error('请输入有效的 URL (http/https)')
      return true
    }
  },
  apiKey: { required: true, message: '请输入 API Key', trigger: ['blur', 'input'] },
  model: { required: true, message: '请选择或输入模型名称', trigger: ['blur', 'change', 'input'] }
}

// Modal visibility | 弹窗可见性
const showModal = ref(props.show)
const testing = ref(false)
const testResult = ref(null)

// Provider Options | 服务商选项
const providerOptions = PROVIDERS.map(p => ({ label: p.label, value: p.value }))

// Endpoint Labels | 端点标签
const endpointLabels = {
    chat: '对话 (Chat)',
    image: '生图 (Image)',
    video: '视频生成',
    videoStatus: '视频查询'
}

// Form data | 表单数据
const formData = reactive({
  apiKey: apiKey.value,
  baseUrl: baseUrl.value,
  provider: provider.value,
  endpoints: { ...customEndpoints.value },
  model: selectedModel.value || 'gpt-3.5-turbo'
})

// Validation Status | 验证状态
const incompleteCount = computed(() => {
  let count = 0
  if (!formData.provider) count++
  if (!formData.apiKey) count++
  if (!formData.model) count++
  if (!formData.baseUrl || !/^https?:\/\/.+/.test(formData.baseUrl)) count++
  return count
})

const isFormValid = computed(() => incompleteCount.value === 0)

// Form Status Alert | 表单状态提示
const formStatus = computed(() => {
  if (isFormValid.value) {
    return {
      show: true,
      type: 'success',
      title: '配置完整',
      content: '配置信息已完整保存',
      icon: CheckmarkCircle,
      class: 'status-success'
    }
  }
  
  if (incompleteCount.value > 0) {
    return {
      show: true,
      type: 'error',
      title: '配置未完成',
      content: `尚有 ${incompleteCount.value} 项配置未完成`,
      icon: Warning,
      class: 'status-error'
    }
  }
  
  return { show: false }
})

// Current endpoints for display (Preset mode) | 当前端点（预设模式）
const currentEndpoints = computed(() => {
    if (formData.provider === 'custom') return formData.endpoints
    const p = getProvider(formData.provider)
    return p ? p.endpoints : {}
})

// Model Options | 模型选项
const modelOptions = computed(() => {
    const fetched = availableModels.value.map(m => ({ label: m.label, value: m.value }))
    // Add current model if not in list
    if (formData.model && !fetched.find(m => m.value === formData.model)) {
        return [{ label: formData.model, value: formData.model }, ...fetched]
    }
    return fetched.length ? fetched : [
        { label: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
        { label: 'gpt-4o', value: 'gpt-4o' },
        { label: 'deepseek-chat', value: 'deepseek-chat' }
    ]
})

// Watch prop changes | 监听属性变化
watch(() => props.show, (val) => {
  showModal.value = val
  if (val) {
    formData.apiKey = apiKey.value
    formData.provider = provider.value
    
    // Ensure Base URL is correct for display (fix legacy proxy paths)
    // 确保显示正确的 Base URL (修复历史遗留的代理路径)
    if (formData.provider !== 'custom') {
      const p = getProvider(formData.provider)
      formData.baseUrl = p ? p.defaultBaseUrl : baseUrl.value
    } else {
      formData.baseUrl = baseUrl.value
    }

    // Always load current active endpoints into form
    formData.endpoints = { ...endpoints.value }
    formData.model = selectedModel.value || 'gpt-3.5-turbo'
    testResult.value = null
    
    // Trigger validation immediately to update status
    // 立即触发验证以更新状态
    if (formRef.value) formRef.value.validate().catch(() => {})
  }
})

// Watch modal changes | 监听弹窗变化
watch(showModal, (val) => {
  emit('update:show', val)
})

// Watch provider change to preview base URL | 监听服务商变化以预览 Base URL
watch(() => formData.provider, (newVal) => {
    if (newVal !== 'custom') {
        const p = getProvider(newVal)
        if (p) {
            formData.baseUrl = p.defaultBaseUrl
            // Also reset endpoints to provider default when switching, unless user manually changes them later
            formData.endpoints = { ...p.endpoints }
        }
    }
})

// Handle Fetch Models | 处理获取模型
const handleFetchModels = async () => {
    if (!formData.apiKey || !formData.baseUrl) {
        message.warning('请先配置 Base URL 和 API Key')
        return
    }
    
    // Temporarily set config to allow fetch
    setApiKey(formData.apiKey)
    setBaseUrl(formData.baseUrl)
    setProvider(formData.provider)

    try {
        const models = await fetchModels()
        if (models.length > 0) {
            message.success(`成功获取 ${models.length} 个模型`)
            if (!formData.model) formData.model = models[0].value
        } else {
            message.warning('未获取到模型列表，请检查配置或手动输入')
        }
    } catch (e) {
        message.error('获取模型列表失败: ' + e.message)
    }
}

// Handle save | 处理保存
const handleSave = () => {
  setProvider(formData.provider)
  setApiKey(formData.apiKey)
  setBaseUrl(formData.baseUrl)
  setSelectedModel(formData.model)
  
  // Save endpoints for ALL providers (treat as custom override)
  Object.entries(formData.endpoints).forEach(([key, val]) => {
      setCustomEndpoint(key, val)
  })
  
  showModal.value = false
  emit('saved')
  message.success('配置已保存')
}

// Handle clear | 处理清除
const handleClear = () => {
  clearConfig()
  formData.apiKey = ''
  formData.baseUrl = 'https://api.chatfire.site/v1'
  formData.provider = 'custom'
  formData.model = ''
}

// Test Connection | 测试连接
const handleTestConnection = async () => {
    if (!formData.apiKey) {
        message.warning('请先输入 API Key')
        return
    }
    
    testing.value = true
    testResult.value = null
    const startTime = Date.now()
    
    try {
        const endpoint = formData.provider === 'custom' ? formData.endpoints.chat : currentEndpoints.value.chat
        const fullUrl = `${formData.baseUrl}${endpoint}`.replace(/([^:]\/)\/+/g, "$1") // remove double slashes
        const modelToUse = formData.model || 'gpt-3.5-turbo'

        // Minimal chat request to test connection
        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${formData.apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse, 
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        })
        
        const duration = Date.now() - startTime
        const data = await res.json()
        
        if (res.ok) {
            const content = data.choices?.[0]?.message?.content || '无内容'
            testResult.value = { 
                type: 'success', 
                title: '连接成功', 
                message: `耗时: ${duration}ms\n模型: ${modelToUse}\n响应: ${content}`,
                details: JSON.stringify(data, null, 2)
            }
        } else {
            const errorMsg = data.error?.message || data.message || `HTTP ${res.status}`
            if (res.status === 400 || (data.error && data.error.type === 'invalid_request_error')) {
                 testResult.value = { 
                     type: 'warning', 
                     title: '连接成功但请求无效', 
                     message: `服务器已响应，但参数可能不匹配 (如模型不存在)。\n错误: ${errorMsg}`,
                     details: JSON.stringify(data, null, 2)
                 }
            } else {
                 testResult.value = { 
                     type: 'error', 
                     title: '连接失败', 
                     message: errorMsg,
                     details: JSON.stringify(data, null, 2)
                 }
            }
        }
        
    } catch (e) {
        testResult.value = { type: 'error', title: '连接错误', message: e.message }
    } finally {
        testing.value = false
    }
}

const getEndpointTagType = (key) => {
    const map = { chat: 'info', image: 'success', video: 'warning', videoStatus: 'warning' }
    return map[key] || 'default'
}
</script>

<style scoped>
.endpoint-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
}

.endpoint-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.endpoint-label {
  font-size: 13px;
  color: var(--text-secondary, #666);
  min-width: 80px;
}

.endpoint-tag {
  font-family: monospace;
  font-size: 12px;
}
</style>
