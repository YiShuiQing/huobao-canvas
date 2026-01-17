/**
 * API Hooks | API Hooks
 * Simplified hooks for open source version | 开源版简化 hooks
 */

import { ref, reactive, onUnmounted } from 'vue'
import {
  generateImage,
  createVideoTask,
  getVideoTaskStatus,
  streamChatCompletions
} from '@/api'
import { getModelConfig } from '@/stores/models'
import { useApiConfig } from './useApiConfig'

/**
 * Base API state hook | 基础 API 状态 Hook
 */
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')

  const reset = () => {
    loading.value = false
    error.value = null
    status.value = 'idle'
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
    status.value = isLoading ? 'running' : status.value
  }

  const setError = (err) => {
    error.value = err
    status.value = 'error'
    loading.value = false
  }

  const setSuccess = () => {
    status.value = 'success'
    loading.value = false
    error.value = null
  }

  return { loading, error, status, reset, setLoading, setError, setSuccess }
}

/**
 * Chat composable | 问答组合式函数
 */
export const useChat = (options = {}) => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const messages = ref([])
  const currentResponse = ref('')
  let abortController = null

  const send = async (content, stream = true, extraOptions = {}) => {
    setLoading(true)
    currentResponse.value = ''

    try {
      const msgList = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        ...messages.value,
        { role: 'user', content }
      ]

      if (stream) {
        status.value = 'streaming'
        abortController = new AbortController()
        let fullResponse = ''

        for await (const chunk of streamChatCompletions(
          { model: extraOptions.model || options.model || 'gpt-4o-mini', messages: msgList },
          abortController.signal
        )) {
          fullResponse += chunk
          currentResponse.value = fullResponse
        }

        messages.value.push({ role: 'user', content })
        messages.value.push({ role: 'assistant', content: fullResponse })
        setSuccess()
        return fullResponse
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        throw err
      }
    }
  }

  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const clear = () => {
    messages.value = []
    currentResponse.value = ''
    reset()
  }

  onUnmounted(() => stop())

  return { loading, error, status, messages, currentResponse, send, stop, clear, reset }
}

/**
 * Image generation composable | 图片生成组合式函数
 * Simplified for open source - fixed input/output format
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const images = ref([])
  const currentImage = ref(null)

  /**
   * Generate image with fixed params | 固定参数生成图片
   * @param {Object} params - { model, prompt, size, n, image (optional ref image) }
   */
  const generate = async (params) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      const modelConfig = getModelConfig(params.model)
      const supportsSizeParam = !!(modelConfig?.defaultParams?.size || (Array.isArray(modelConfig?.sizes) && modelConfig.sizes.length > 0))

      const requestData = {
        model: params.model,
        prompt: params.prompt
      }

      if (supportsSizeParam) {
        requestData.size = params.size || modelConfig?.defaultParams?.size || '1024x1024'
      }

      // Add reference image if provided | 添加参考图
      if (params.image) {
        requestData.image = params.image
      }

      // Call API | 调用 API
      const response = await generateImage(requestData, {
        requestType: 'json',
        endpoint: modelConfig?.endpoint || '/images/generations'
      })

      // Parse response (OpenAI format) | 解析响应
      const data = response.data || response
      const generatedImages = (Array.isArray(data) ? data : [data]).map(item => ({
        url: item.url || item.b64_json || item,
        revisedPrompt: item.revised_prompt || ''
      }))

      images.value = generatedImages
      currentImage.value = generatedImages[0] || null
      setSuccess()
      return generatedImages
    } catch (err) {
      const httpStatus = err?.response?.status
      const serverMessage = err?.response?.data?.error?.message || err?.response?.data?.message
      const message = serverMessage || err?.message || '生成失败'
      const friendly = httpStatus === 400 ? `请求参数不合法: ${message}` : message
      const e = new Error(friendly)
      e.httpStatus = httpStatus
      e.data = err?.response?.data
      setError(e)
      throw e
    }
  }

  return { loading, error, status, images, currentImage, generate, reset }
}

/**
 * Video generation composable | 视频生成组合式函数
 * Simplified for open source - fixed input/output format with polling
 */
export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { provider } = useApiConfig()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  /**
   * Generate video with fixed params | 固定参数生成视频
   * @param {Object} params - { model, prompt, first_frame_image, last_frame_image, ratio, duration }
   */
  const generate = async (params) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      const modelConfig = getModelConfig(params.model)
      console.log('[useVideoGeneration] input params', params)
      console.log('[useVideoGeneration] model config', { model: params.model, hasConfig: !!modelConfig })
      
      // Build request data | 构建请求数据
      let requestData = {
        model: params.model,
        prompt: params.prompt || ''
      }
      
      // Adapt payload for Volc Engine | 适配火山引擎请求结构
      if (provider.value === 'volc_engine') {
        const content = []
        // Add text prompt | 添加文本提示词
        if (params.prompt) {
          content.push({ type: 'text', text: params.prompt })
        }
        // Add first frame image | 添加首帧图片
        if (params.first_frame_image) {
          content.push({ 
            type: 'image_url', 
            image_url: { url: params.first_frame_image } 
          })
        }
        // Add last frame image | 添加尾帧图片
        if (params.last_frame_image) {
           content.push({ 
            type: 'image_url', 
            image_url: { url: params.last_frame_image } 
          })
        }

        requestData = {
          model: params.model,
          content,
          generate_audio: true,
          ratio: params.ratio || 'adaptive',
          duration: params.dur || 5,
          watermark: false
        }
      } else {
        // Standard/Default payload structure | 标准/默认请求结构
        // Add optional params | 添加可选参数
        if (params.first_frame_image) requestData.first_frame_image = params.first_frame_image
        if (params.last_frame_image) requestData.last_frame_image = params.last_frame_image
        if (params.ratio) requestData.size = params.ratio
        if (params.dur) requestData.seconds = params.dur
      }

      console.log('[useVideoGeneration] request data', requestData)

      // Call API | 调用 API
      const task = await createVideoTask(requestData, {
        requestType: 'json',
        endpoint: modelConfig?.endpoint
      })

      console.log('[useVideoGeneration] task response', task)

      // Check if async (need polling) | 检查是否异步
      const isAsync = modelConfig?.async !== false

      // If has video URL directly, return | 如果直接有视频 URL，返回
      if (!isAsync || task.data?.url || task.url) {
        const videoUrl = task.data?.url || task.url || task.data?.[0]?.url
        video.value = { url: videoUrl, ...task }
        setSuccess()
        return video.value
      }

      // Get task ID for polling | 获取任务 ID 用于轮询
      const id = task.id || task.task_id || task.taskId
      if (!id) {
        throw new Error('未获取到任务 ID')
      }

      taskId.value = id
      status.value = 'polling'

      // Poll for result | 轮询获取结果
      const maxAttempts = 120
      const interval = 5000

      for (let i = 0; i < maxAttempts; i++) {
        progress.attempt = i + 1
        progress.percentage = Math.min(Math.round((i / maxAttempts) * 100), 99)

        const result = await getVideoTaskStatus(id)

        // Check for completion | 检查是否完成
        if (result.status === 'completed' || result.status === 'succeeded' || result.data) {
          progress.percentage = 100
          const videoUrl = result.content?.video_url || result.data?.url || result.data?.[0]?.url || result.url || result.video_url
          video.value = { url: videoUrl, ...result }
          setSuccess()
          return video.value
        }

        // Check for failure | 检查是否失败
        if (result.status === 'failed' || result.status === 'error') {
          throw new Error(result.error?.message || result.message || '视频生成失败')
        }

        // Wait before next poll | 等待下次轮询
        await new Promise(resolve => setTimeout(resolve, interval))
      }

      throw new Error('视频生成超时')
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, video, taskId, progress, generate, reset }
}

/**
 * Combined API composable | 综合 API 组合式函数
 */
export const useApi = () => {
  const config = useApiConfig()
  const chat = useChat()
  const image = useImageGeneration()
  const videoGen = useVideoGeneration()

  return { config, chat, image, video: videoGen }
}
