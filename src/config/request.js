/**
 * Request Configuration | 请求配置
 * Defines default policies for API requests
 */

export const REQUEST_POLICIES = {
  // Default timeout in milliseconds (60s)
  TIMEOUT: 60000,
  
  // Maximum retry attempts
  MAX_RETRIES: 3,
  
  // Retry delay in milliseconds (initial)
  RETRY_DELAY: 1000,
  
  // HTTP Status codes to retry
  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
  
  // Headers to mask in logs
  SENSITIVE_HEADERS: ['authorization', 'x-api-key', 'cookie']
}

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
}
