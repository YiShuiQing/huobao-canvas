/**
 * Chat API | 对话 API
 */

import { request, getBaseUrl } from '@/utils'
import { getEndpoint } from '@/hooks/useApiConfig'
import { aiRequest } from '@/utils/aiRequest'
import { addRequestLog, updateRequestLog } from '@/stores/requestLog'

// 对话补全
export const chatCompletions = (data) =>
  request({
    url: getEndpoint('chat'),
    method: 'post',
    data
  })

// 流式对话补全
export const streamChatCompletions = async function* (data, signal) {
  const baseUrl = getBaseUrl()
  const endpoint = getEndpoint('chat')
  // Ensure no double slash, though usually endpoint starts with /
  const url = `${baseUrl.replace(/\/+$/, '')}${endpoint}`

  // Use standardized aiRequest
  const response = await aiRequest({
    url,
    method: 'POST',
    data: { ...data, stream: true },
    signal,
    stream: true,
    type: 'chat'
  })

  // At this point, response is guaranteed to be ok (200-299)
  // But we still need to handle the stream reading manually here
  // Note: logs are initialized in aiRequest, but we need to update success status 
  // after full stream consumption if we want precise "stream finished" logging.
  // However, aiRequest already marks it as success upon receiving headers.
  // We can optionally add a specialized logger here if needed, but the basic requirement is met.

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const chunk = trimmed.slice(5).trim()
        if (chunk === '[DONE]') return

        try {
          const parsed = JSON.parse(chunk)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch (e) {}
      }
    }
  } catch (err) {
    // Stream interruption error
    console.error('Stream reading failed:', err)
    throw err
  }
}
