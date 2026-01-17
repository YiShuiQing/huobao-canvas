/**
 * Models Configuration | 模型配置
 * Centralized model configuration with 5 categories
 */

// --- Shared Options ---

// Seedream image size options
export const SEEDREAM_SIZE_OPTIONS = [
    { label: '21:9 (3024x1296)', key: '3024x1296' },
    { label: '16:9 (2560x1440)', key: '2560x1440' },
    { label: '4:3 (2304x1728)', key: '2304x1728' },
    { label: '3:2 (2496x1664)', key: '2496x1664' },
    { label: '1:1 (2048x2048)', key: '2048x2048' },
    { label: '2:3 (1664x2496)', key: '1664x2496' },
    { label: '3:4 (1728x2304)', key: '1728x2304' },
    { label: '9:16 (1440x2560)', key: '1440x2560' },
    { label: '9:21 (1296x3024)', key: '1296x3024' }
]

// Seedream 4K image size options | 豆包4K图片尺寸选项
export const SEEDREAM_4K_SIZE_OPTIONS = [
    { label: '21:9', key: '6198x2656' },
    { label: '16:9', key: '5404x3040' },
    { label: '4:3', key: '4694x3520' },
    { label: '3:2', key: '4992x3328' },
    { label: '1:1', key: '4096x4096' },
    { label: '2:3', key: '3328x4992' },
    { label: '3:4', key: '3520x4694' },
    { label: '9:16', key: '3040x5404' },
    { label: '9:21', key: '2656x6198' }
]

// Seedream quality options | 豆包画质选项
export const SEEDREAM_QUALITY_OPTIONS = [
    { label: '标准画质', key: 'standard' },
    { label: '4K 高清', key: '4k' }
]

// Video ratio options
export const VIDEO_RATIO_LIST = [
    { label: '16:9 (横版)', key: '16:9' },
    { label: '4:3', key: '4:3' },
    { label: '1:1 (方形)', key: '1:1' },
    { label: '3:4', key: '3:4' },
    { label: '9:16 (竖版)', key: '9:16' }
]

// Video duration options
export const VIDEO_DURATION_OPTIONS = [
    { label: '5 秒', key: 5 },
    { label: '10 秒', key: 10 }
]

// --- 1. Text Polishing Models (文本润色) ---
export const TEXT_POLISHING_MODELS = [
    { label: 'GPT-4o Mini', key: 'gpt-4o-mini' },
    { label: 'GPT-4o', key: 'gpt-4o' },
    { label: 'GPT-5.2', key: 'gpt-5.2' },
    { label: 'DeepSeek Chat', key: 'deepseek-chat' },
    { label: '豆包 Seed Flash', key: 'doubao-seed-1-6-flash-250615' },
    { label: 'Gemini 3 Pro', key: 'gemini-3-pro' },
    { label: 'Doubao Pro 4k', key: 'doubao-pro-4k' },
    { label: 'Doubao Lite 4k', key: 'doubao-lite-4k' }
]

// --- 2. Text to Image Models (文生图) ---
export const TEXT_TO_IMAGE_MODELS = [
    {
        label: '豆包 Seedream 4.5 (免费)',
        key: 'free/doubao-seedream-4.5',
        sizes: SEEDREAM_SIZE_OPTIONS.map(s => s.key),
        qualities: SEEDREAM_QUALITY_OPTIONS,
        getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: { size: '2048x2048', quality: 'standard', style: 'vivid' }
    },
    {
        label: '豆包 Seedream 4.5',
        key: 'doubao-seedream-4-5-251128',
        sizes: SEEDREAM_SIZE_OPTIONS.map(s => s.key),
        qualities: SEEDREAM_QUALITY_OPTIONS,
        getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: { size: '2048x2048', quality: 'standard', style: 'vivid' }
    },
    {
        label: 'Nano Banana',
        key: 'nano-banana',
        tips: '尺寸写在提示词中: 尺寸 9:16',
        sizes: [],
        defaultParams: { quality: 'standard', style: 'vivid' }
    },
    {
        label: 'Nano Banana Pro',
        key: 'nano-banana-pro',
        tips: '尺寸写在提示词中: 尺寸 9:16',
        sizes: [],
        defaultParams: { quality: 'standard', style: 'vivid' }
    }
]

// --- 3. Image to Image Models (图生图) ---
// Initially same as T2I, but can be customized
export const IMAGE_TO_IMAGE_MODELS = [...TEXT_TO_IMAGE_MODELS]

// --- 4. Image to Video Models (图生视频) ---
export const IMAGE_TO_VIDEO_MODELS = [
    {
        label: '豆包视频 720P',
        key: 'doubao-seedance-1-5-pro_720p',
        ratios: VIDEO_RATIO_LIST.map(s => s.key),
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        defaultParams: { ratio: '16:9', duration: 5 }
    },
    {
        label: 'Wan 2.6 720P', key: 'wan2.6_720p',
        ratios: VIDEO_RATIO_LIST.map(s => s.key),
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        defaultParams: { ratio: '16:9', duration: 5 }
    },
    {
        label: 'Sora 2', key: 'sora-2',
        ratios: VIDEO_RATIO_LIST.map(s => s.key),
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        defaultParams: { ratio: '16:9', duration: 5 }
    }
]

// --- 5. Video to Video Models (视频生视频) ---
// Usually same as I2V or specialized models
export const VIDEO_TO_VIDEO_MODELS = [...IMAGE_TO_VIDEO_MODELS]


// --- Backward Compatibility Exports (Legacy) ---
export const CHAT_MODELS = TEXT_POLISHING_MODELS
export const IMAGE_MODELS = TEXT_TO_IMAGE_MODELS
export const VIDEO_MODELS = IMAGE_TO_VIDEO_MODELS

// --- Default Values ---
export const DEFAULT_IMAGE_MODEL = 'free/doubao-seedream-4.5'
export const DEFAULT_VIDEO_MODEL = 'free/doubao-seedance-1-5-pro_480p'
export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
export const DEFAULT_IMAGE_SIZE = '1024x1024'
export const DEFAULT_VIDEO_RATIO = '16:9'
export const DEFAULT_VIDEO_DURATION = 5

// --- Options Exports ---
export const IMAGE_SIZE_OPTIONS = [
    { label: '1024x1024', key: '1024x1024' },
    { label: '1792x1024 (横版)', key: '1792x1024' },
    { label: '1024x1792 (竖版)', key: '1024x1792' }
]

export const IMAGE_QUALITY_OPTIONS = [
    { label: '标准', key: 'standard' },
    { label: '高清', key: 'hd' }
]

export const IMAGE_STYLE_OPTIONS = [
    { label: '生动', key: 'vivid' },
    { label: '自然', key: 'natural' }
]

export const VIDEO_RATIO_OPTIONS = VIDEO_RATIO_LIST

// Helper
export const getModelByName = (key) => {
    const allModels = [
        ...TEXT_POLISHING_MODELS,
        ...TEXT_TO_IMAGE_MODELS,
        ...IMAGE_TO_IMAGE_MODELS,
        ...IMAGE_TO_VIDEO_MODELS,
        ...VIDEO_TO_VIDEO_MODELS
    ]
    // Use Map to deduplicate by key if needed, or just find
    return allModels.find(m => m.key === key)
}
