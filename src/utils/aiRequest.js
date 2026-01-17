/**
 * Standardized AI Request Utility | 标准化 AI 请求工具
 * Handles validation, retry, logging, and security for AI model requests.
 */

import { addRequestLog, updateRequestLog } from '@/stores/requestLog'
import { REQUEST_POLICIES } from '@/config/request'

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * AI Request Handler
 * @param {object} params
 * @param {string} params.url - API Endpoint
 * @param {string} params.method - HTTP Method (default: POST)
 * @param {object} params.data - Request body
 * @param {object} params.headers - Custom headers
 * @param {AbortSignal} params.signal - Abort signal
 * @param {boolean} params.stream - Whether to expect a stream response
 * @param {string} params.type - Request type for logging (chat, image, etc.)
 */
export const aiRequest = async ({
  url,
  method = 'POST',
  data = {},
  headers = {},
  signal,
  stream = false,
  type = 'unknown'
}) => {
  // 1. Central Config & Defaults
  const apiKey = localStorage.getItem('apiKey')
  const maxRetries = REQUEST_POLICIES.MAX_RETRIES
  let retryCount = 0
  
  // 2. Validation
  if (!url) throw new Error('Request URL is required')
  if (!apiKey && !headers.Authorization) throw new Error('API Key is missing')
  
  // Prepare headers (Security)
  const finalHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...headers
  }
  
  // Prepare payload
  const body = JSON.stringify(data)
  
  // 3. Performance Monitoring (Start)
  const startTs = Date.now()
  const logId = addRequestLog({
    type,
    method,
    url,
    model: data.model || '',
    requestPreview: { ...data, stream }
  })
  
  // Retry Loop
  while (retryCount <= maxRetries) {
    try {
      // Check timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_POLICIES.TIMEOUT)
      
      // Combine signals (user abort + timeout)
      const finalSignal = signal || controller.signal
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          controller.abort()
        })
      }

      // Execute Request
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body,
        signal: finalSignal
      })
      
      clearTimeout(timeoutId)

      // 4. Error Handling (HTTP Status)
      if (!response.ok) {
        // Determine if retryable
        if (REQUEST_POLICIES.RETRY_STATUS_CODES.includes(response.status) && retryCount < maxRetries) {
          retryCount++
          const delay = REQUEST_POLICIES.RETRY_DELAY * Math.pow(2, retryCount - 1) // Exponential backoff
          console.warn(`Request failed with ${response.status}. Retrying (${retryCount}/${maxRetries}) in ${delay}ms...`)
          await sleep(delay)
          continue
        }
        
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`)
      }

      // 5. Success Handling
      // For streams, return the response directly to let caller handle the reader
      if (stream) {
        // Log initial success, actual completion tracked by caller or inferred
        updateRequestLog(logId, {
          status: 'success',
          httpStatus: response.status,
          durationMs: Date.now() - startTs
        })
        return response
      }

      // For JSON, parse and log
      const resData = await response.json()
      updateRequestLog(logId, {
        status: 'success',
        httpStatus: response.status,
        durationMs: Date.now() - startTs,
        responsePreview: resData
      })
      
      return resData

    } catch (err) {
      const isAbort = err.name === 'AbortError'
      
      // If aborted by user, don't retry
      if (isAbort && signal?.aborted) {
         updateRequestLog(logId, {
          status: 'error',
          errorMessage: 'Request aborted by user',
          durationMs: Date.now() - startTs
        })
        throw err
      }
      
      // If timeout or network error, retry if limits allow
      if ((isAbort || err.message.includes('NetworkError') || err.message.includes('fetch')) && retryCount < maxRetries) {
        retryCount++
        const delay = REQUEST_POLICIES.RETRY_DELAY * Math.pow(2, retryCount - 1)
        console.warn(`Network/Timeout error. Retrying (${retryCount}/${maxRetries}) in ${delay}ms...`)
        await sleep(delay)
        continue
      }
      
      // Final failure
      updateRequestLog(logId, {
        status: 'error',
        errorMessage: err.message,
        durationMs: Date.now() - startTs
      })
      throw err
    }
  }
}
