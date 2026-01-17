/**
 * API Providers Configuration | API 服务提供商配置
 */

import { DEFAULT_ENDPOINTS } from '@/utils/constants'

export const PROVIDERS = [
  {
    label: '自定义 (Custom)',
    value: 'custom',
    defaultBaseUrl: 'https://api.chatfire.site/v1',
    endpoints: { ...DEFAULT_ENDPOINTS },
    modelListUrl: '' // Manual input or custom URL
  },
  {
    label: '火山引擎 (Volc Engine)',
    value: 'volc_engine',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    endpoints: { ...DEFAULT_ENDPOINTS },
    // Volc Engine uses standard /models but might require specific query params in some versions
    // Ark: https://ark.cn-beijing.volces.com/api/v3/models
    modelListUrl: '/models'
  }
]

export const getProvider = (value) => PROVIDERS.find(p => p.value === value) || PROVIDERS[0]
