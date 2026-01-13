/**
 * Model Schema Utils | 模型 Schema 工具
 */

import { DEFAULT_CHAT_CONFIG } from './constants'

/**
 * Parse model schema | 解析模型 Schema
 * @param {string|Object} schemaStr - Schema string or object
 * @returns {Object} Parsed schema
 */
export const parseModelSchema = (schemaStr) => {
  const defaultResult = {
    input: [],
    inputTransform: null,
    requestType: 'json',
    asyncMode: 'auto',
    chatConfig: DEFAULT_CHAT_CONFIG,
    output: null
  }

  if (!schemaStr) return defaultResult

  try {
    const schema = typeof schemaStr === 'string' ? JSON.parse(schemaStr) : schemaStr

    // New format: { input, inputTransform, requestType, asyncMode, chatConfig, output }
    if (schema && typeof schema === 'object' && !Array.isArray(schema) && (schema.input || schema.output)) {
      return {
        input: Array.isArray(schema.input) ? schema.input : [],
        inputTransform: schema.inputTransform || null,
        requestType: schema.requestType || 'json',
        asyncMode: schema.asyncMode || 'auto',
        chatConfig: schema.chatConfig ? { ...DEFAULT_CHAT_CONFIG, ...schema.chatConfig } : DEFAULT_CHAT_CONFIG,
        output: schema.output || null
      }
    }

    // Old format: just input array
    if (Array.isArray(schema)) {
      return { ...defaultResult, input: schema }
    }

    return defaultResult
  } catch (e) {
    console.error('Parse schema error:', e)
    return defaultResult
  }
}

/**
 * Extract form config from schema | 从 schema 提取表单配置
 * @param {Array} inputFields - Schema input fields
 * @returns {Object} Form configuration
 */
export const extractFormConfig = (inputFields) => {
  if (!inputFields || !Array.isArray(inputFields)) {
    return { sizeOptions: [], hasRefImage: false, hasRefImages: false }
  }

  // Extract size options
  const sizeField = inputFields.find(f => f.key === 'size' || f.key === 'resolution')
  const sizeOptions = sizeField?.options?.map(opt => ({
    label: typeof opt === 'string' ? opt : (opt.label || opt.value),
    key: typeof opt === 'string' ? opt : opt.value
  })) || []

  // Check for reference image support
  const imageField = inputFields.find(f => f.type === 'image')
  const imagesField = inputFields.find(f => f.type === 'images')

  return {
    sizeOptions,
    hasRefImage: !!imageField,
    hasRefImages: !!imagesField,
    imageFieldKey: imageField?.key || 'image',
    imagesFieldKey: imagesField?.key || 'images',
    minImages: imagesField?.min || 1,
    maxImages: imagesField?.max || 9
  }
}

/**
 * Initialize form data from schema | 从 schema 初始化表单数据
 * @param {Array} inputFields - Schema input fields
 * @param {string} modelName - Model name
 * @returns {Object} Initial form data
 */
export const initFormDataFromSchema = (inputFields, modelName) => {
  const data = { model: modelName }

  if (!inputFields || !Array.isArray(inputFields)) {
    return data
  }

  inputFields.forEach(field => {
    if (field.defaultValue !== undefined && field.defaultValue !== '') {
      data[field.key] = field.defaultValue
    } else if (field.type === 'checkbox' || field.type === 'images') {
      data[field.key] = []
    } else if (field.type === 'switch') {
      data[field.key] = false
    } else if (field.type === 'number' || field.type === 'slider') {
      data[field.key] = field.min || 0
    } else {
      data[field.key] = ''
    }
  })

  return data
}

/**
 * Get nested value from object | 获取嵌套对象的值
 * @param {Object} obj - Source object
 * @param {string} path - Path like "data.url" or "choices.0.message"
 * @returns {*} Value at path
 */
export const getNestedValue = (obj, path) => {
  if (!obj || !path) return obj
  const paths = path.split('.')
  let value = obj
  for (const p of paths) {
    value = value?.[p]
  }
  return value
}

/**
 * Apply input transform | 应用输入转换
 * 支持语法：
 * - $${key} - 替换为表单字段值
 * - $${key[0]} - 替换为数组字段的指定索引值
 * - @conditional: "key" - 条件包含，仅当字段有值时才包含该对象
 * @param {Object} transform - Transform template
 * @param {Object} data - Form data
 * @returns {Object} Transformed data
 */
export const applyInputTransform = (transform, data) => {
  if (!transform) return data
  
  // 获取字段值，支持数组索引访问如 images[0]
  const getValue = (fieldPath) => {
    const match = fieldPath.match(/^(\w+)\[(\d+)\]$/)
    if (match) {
      const [, arrayKey, index] = match
      const arr = data[arrayKey]
      if (Array.isArray(arr)) {
        return arr[parseInt(index)]
      }
      return undefined
    }
    return data[fieldPath]
  }
  
  // 检查字段是否有值
  const hasValue = (fieldPath) => {
    const value = getValue(fieldPath)
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    if (value instanceof File) return true
    return true
  }
  
  // 递归替换模板中的占位符
  const replaceTemplate = (obj) => {
    if (typeof obj === 'string') {
      // 检查是否是单独的 $${key} 占位符
      const singleMatch = obj.match(/^\$\$\{([\w\[\]]+)\}$/)
      if (singleMatch) {
        const value = getValue(singleMatch[1])
        if (value instanceof File) return value
        return value !== undefined && value !== '' ? value : ''
      }
      // 替换 $${key} 为实际值
      return obj.replace(/\$\$\{([\w\[\]]+)\}/g, (match, fieldPath) => {
        const value = getValue(fieldPath)
        if (value instanceof File) return ''
        return value !== undefined && value !== '' ? value : ''
      })
    }
    if (Array.isArray(obj)) {
      const result = []
      for (const item of obj) {
        if (typeof item === 'object' && item !== null && !(item instanceof File) && item['@conditional']) {
          const condField = item['@conditional']
          if (hasValue(condField)) {
            const newItem = { ...item }
            delete newItem['@conditional']
            result.push(replaceTemplate(newItem))
          }
        } else {
          const processed = replaceTemplate(item)
          if (processed instanceof File) {
            result.push(processed)
          } else if (typeof processed === 'string') {
            if (processed !== '') result.push(processed)
          } else {
            result.push(processed)
          }
        }
      }
      return result
    }
    if (typeof obj === 'object' && obj !== null) {
      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        const processed = replaceTemplate(value)
        if (Array.isArray(processed) && processed.length === 0) continue
        result[key] = processed
      }
      return result
    }
    return obj
  }
  
  return replaceTemplate(transform)
}

/**
 * Build request body with FormData support | 构建请求体，支持 FormData
 * @param {Object} params - Request parameters
 * @param {string} requestType - 'json' or 'formdata'
 * @returns {Object|FormData} Request body
 */
export const buildRequestBody = (params, requestType = 'json') => {
  if (requestType !== 'formdata') {
    return params
  }

  const fd = new FormData()
  
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (item instanceof File) {
          fd.append(`${key}[${idx}]`, item, item.name)
        } else if (typeof item === 'object' && item !== null) {
          fd.append(`${key}[${idx}]`, JSON.stringify(item))
        } else {
          fd.append(`${key}[${idx}]`, item)
        }
      })
    } else if (value instanceof File) {
      fd.append(key, value, value.name)
    } else if (typeof value === 'object' && value !== null) {
      fd.append(key, JSON.stringify(value))
    } else if (value !== undefined && value !== null && value !== '') {
      fd.append(key, value)
    }
  }
  
  return fd
}

/**
 * Parse API result based on output schema | 根据输出 schema 解析 API 结果
 * @param {Object} result - API response
 * @param {Object} outputSchema - Output schema with displayField
 * @param {string} resultType - Result type: 'image', 'video', 'chat'
 * @returns {Array} Parsed results
 */
export const parseApiResult = (result, outputSchema, resultType = 'image') => {
  if (!result) return []
  
  // Default field based on result type
  const defaultField = resultType === 'video' ? 'video_url' : (resultType === 'image' ? 'data' : null)
  const displayField = outputSchema?.displayField || defaultField
  
  // No displayField, try default parsing
  if (!displayField) {
    if (result?.data) {
      return Array.isArray(result.data) ? result.data : [result.data]
    }
    return [result]
  }
  
  // Parse displayField path
  // Supports: "data", "data[].url", "choices[].message.content"
  if (displayField.includes('[]')) {
    // Array path like data[].url
    const [arrayPath, ...rest] = displayField.split('[]')
    const fieldPath = rest.join('[]').replace(/^\./, '') // Remove leading dot
    
    // Get array
    let data = arrayPath ? getNestedValue(result, arrayPath) : result
    
    if (!Array.isArray(data)) {
      data = data ? [data] : []
    }
    
    // Extract field from each element if fieldPath exists
    if (fieldPath) {
      return data.map(item => getNestedValue(item, fieldPath)).filter(Boolean)
    }
    
    return data
  } else {
    // Simple path like "data"
    const data = getNestedValue(result, displayField)
    return Array.isArray(data) ? data : (data ? [data] : [])
  }
}
