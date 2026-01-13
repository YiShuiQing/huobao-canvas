/**
 * API Hooks | API Hooks
 * Vue hooks for API integration in components
 */

import { ref, reactive, onUnmounted } from 'vue'
import {
  generateImage,
  createVideoTask,
  pollVideoTask,
  getVideoTaskStatus,
  streamChatCompletions
} from '@/api'
import { parseApiResult, applyInputTransform, buildRequestBody } from '@/utils'
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

  const send = async (content, stream = true) => {
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
          { model: options.model || 'doubao-seed-1-6-flash-250615', messages: msgList },
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
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const images = ref([])
  const currentImage = ref(null)

  /**
   * Generate image with flexible response parsing
   * @param {Object} options - Generation options (raw form data)
   * @param {Object} schemaConfig - Model schema config { inputTransform, requestType, asyncMode, endpoint, output }
   */
  const generate = async (options, schemaConfig = null) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      // Apply input transform if provided | 如果有 inputTransform 则应用
      let requestData = options
      if (schemaConfig?.inputTransform) {
        requestData = { ...applyInputTransform(schemaConfig.inputTransform, options), model: options.model}
      }

      // Build request body (FormData or JSON) | 构建请求体
      const requestType = schemaConfig?.requestType || 'json'
      const requestBody = buildRequestBody(requestData, requestType)

      // Call API with options | 调用 API
      const response = await generateImage(requestBody, {
        requestType,
        endpoint: schemaConfig?.endpoint || '/images/generations'
      })

      // Parse result based on output schema
      const parsedData = parseApiResult(response, schemaConfig?.output, 'image')

      // Normalize result to array of {url, revisedPrompt}
      const generatedImages = parsedData.map(item => {
        if (typeof item === 'string') {
          return { url: item, revisedPrompt: '' }
        }
        return {
          url: item.url || item,
          revisedPrompt: item.revised_prompt || ''
        }
      })

      images.value = generatedImages
      currentImage.value = generatedImages[0] || null
      setSuccess()
      return generatedImages
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, images, currentImage, generate, reset }
}

/**
 * Video generation composable | 视频生成组合式函数
 */
export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  /**
   * Generate video with flexible response parsing
   * @param {Object} options - Generation options (raw form data)
   * @param {Object} schemaConfig - Model schema config { inputTransform, requestType, asyncMode, endpoint, output, typeName }
   */
  const generate = async (options, schemaConfig = null) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      // Apply input transform if provided | 如果有 inputTransform 则应用
      let requestData = options
      if (schemaConfig?.inputTransform) {
        requestData = { ...applyInputTransform(schemaConfig.inputTransform, options), model: options.model }
      }

      // Build request body (FormData or JSON) | 构建请求体
      // Video defaults to formdata | 视频默认使用 formdata
      const requestType = schemaConfig?.requestType || 'formdata'
      const requestBody = buildRequestBody(requestData, requestType)

      // Call API | 调用 API
      const task = await createVideoTask(requestBody, {
        requestType,
        endpoint: schemaConfig?.endpoint || '/videos'
      })

      // Check if need polling | 判断是否需要轮询
      // asyncMode: 'auto' - 视频异步，图片同步
      // asyncMode: 'sync' - 强制同步
      // asyncMode: 'async' - 强制异步轮询
      const isVideo = schemaConfig?.typeName === '视频'
      const asyncMode = schemaConfig?.asyncMode || 'auto'
      const needPolling = asyncMode === 'async' || (asyncMode === 'auto' && isVideo)

      // If sync mode or already has data, return directly | 同步模式或已有数据，直接返回
      if (!needPolling || (task.data && !task.id)) {
        const parsedData = parseApiResult(task, schemaConfig?.output, 'video')
        const videoUrl = Array.isArray(parsedData) ? parsedData[0] : parsedData
        video.value = { url: typeof videoUrl === 'string' ? videoUrl : videoUrl?.url, ...task }
        setSuccess()
        return video.value
      }

      // Handle different response formats | 处理不同的响应格式
      const id = task.id || task.task_id || task.taskId
      if (!id) {
        throw new Error('未获取到任务 ID')
      }

      taskId.value = id
      status.value = 'polling'

      // Poll with progress updates | 带进度更新的轮询
      const maxAttempts = 120
      const interval = 5000

      for (let i = 0; i < maxAttempts; i++) {
        progress.attempt = i + 1
        progress.percentage = Math.min(Math.round((i / maxAttempts) * 100), 99)

        const result = await getVideoTaskStatus(id)

        // Check for completion | 检查是否完成
        if (result.status === 'completed' || result.status === 'succeeded' || result.data) {
          progress.percentage = 100

          // Parse result based on output schema | 根据输出 schema 解析结果
          let videoUrl = ''
          if (schemaConfig?.output) {
            const parsedData = parseApiResult(result, schemaConfig.output, 'video')
            videoUrl = Array.isArray(parsedData) ? parsedData[0] : parsedData
          } else {
            // Fallback parsing | 回退解析
            videoUrl = result.data?.url || result.data?.[0]?.url || result.url || result.video_url
          }

          video.value = { url: typeof videoUrl === 'string' ? videoUrl : videoUrl?.url, ...result }
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
