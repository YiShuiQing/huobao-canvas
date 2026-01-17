<template>
  <n-modal v-model:show="showModal" preset="card" title="模型配置 (Model Settings)" style="width: 1000px; max-width: 95vw;">
    <n-tabs type="line" animated>
      <!-- 1. Text Polishing -->
      <n-tab-pane name="text-polishing" tab="文本润色 (LLM)">
        <ModelManager :models="textPolishingOptions" category="text-polishing" />
      </n-tab-pane>
      
      <!-- 2. Text to Image -->
      <n-tab-pane name="text-to-image" tab="文生图 (T2I)">
        <ModelManager :models="textToImageOptions" category="text-to-image" />
      </n-tab-pane>
      
      <!-- 3. Image to Image -->
      <n-tab-pane name="image-to-image" tab="图生图 (I2I)">
        <ModelManager :models="imageToImageOptions" category="image-to-image" />
      </n-tab-pane>
      
      <!-- 4. Image to Video -->
      <n-tab-pane name="image-to-video" tab="图生视频 (I2V)">
        <ModelManager :models="imageToVideoOptions" category="image-to-video" />
      </n-tab-pane>
      
      <!-- 5. Video to Video -->
      <n-tab-pane name="video-to-video" tab="视频生视频 (V2V)">
        <ModelManager :models="videoToVideoOptions" category="video-to-video" />
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showModal = false">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, h, reactive, defineComponent } from 'vue'
import { 
  NModal, NTabs, NTabPane, NButton, NDataTable, NTag, NSpace, NInput, 
  NSelect, NPopconfirm, useMessage, NIcon, NTooltip
} from 'naive-ui'
import { 
  TrashOutline, CreateOutline, CheckmarkOutline, CloseOutline, AddOutline 
} from '@vicons/ionicons5'
import { 
  textPolishingOptions, 
  textToImageOptions, 
  imageToImageOptions, 
  imageToVideoOptions, 
  videoToVideoOptions,
  addModelToCategory,
  updateModel,
  deleteModel
} from '@/stores/models'
import { useApiConfig } from '@/hooks/useApiConfig'

const showModal = ref(false)

// Expose open method
const open = () => {
  showModal.value = true
}

defineExpose({ open })

// --- Model Manager Component ---
const ModelManager = defineComponent({
  props: ['models', 'category'],
  setup(props) {
    const message = useMessage()
    const { availableModels, fetchModels, isFetchingModels } = useApiConfig()
    
    // State
    const editingKey = ref(null) // Key of the row being edited
    const isAdding = ref(false) // Whether we are adding a new row
    const editForm = reactive({ label: '', key: '' })
    const addForm = reactive({ label: '', key: '' })
    
    // For ID selection: toggle between select and manual input
    const isManualInput = ref(false)
    const isAddManualInput = ref(false)

    // Options for ID selector (from API)
    const idOptions = computed(() => {
      return availableModels.value.map(m => ({ label: m.label || m.value, value: m.value }))
    })

    // Start Adding
    const startAdd = async () => {
      isAdding.value = true
      addForm.label = ''
      addForm.key = ''
      isAddManualInput.value = true // Default to Manual Input
    }

    // Cancel Adding
    const cancelAdd = () => {
      isAdding.value = false
      addForm.label = ''
      addForm.key = ''
    }

    // Save New Model
    const saveAdd = () => {
      if (!addForm.label || !addForm.key) {
        message.warning('请填写模型名称和 ID')
        return
      }
      
      // Check duplicate
      if (props.models.find(m => m.key === addForm.key)) {
        message.error('该模型 ID 已存在')
        return
      }

      addModelToCategory(props.category, { ...addForm, isCustom: true }, true)
      message.success('添加成功')
      cancelAdd()
    }

    // Start Editing
    const startEdit = async (row) => {
      editingKey.value = row.key
      editForm.label = row.label
      editForm.key = row.key
      // Check if current key exists in options, if so use select, else manual
      const exists = idOptions.value.some(o => o.value === row.key)
      isManualInput.value = !exists
    }

    // Cancel Editing
    const cancelEdit = () => {
      editingKey.value = null
    }

    // Save Editing
    const saveEdit = (originalKey) => {
      if (!editForm.label || !editForm.key) {
        message.warning('请填写模型名称和 ID')
        return
      }
      
      // If key changed, check duplicate
      if (editForm.key !== originalKey && props.models.find(m => m.key === editForm.key)) {
        message.error('该模型 ID 已存在')
        return
      }

      updateModel(props.category, originalKey, { ...editForm })
      message.success('更新成功')
      editingKey.value = null
    }

    // Delete Model
    const handleDelete = (row) => {
      deleteModel(props.category, row.key)
      message.success('已删除')
    }

    // Toggle Handlers
    const handleToggleEditMode = () => {
      if (isManualInput.value) {
        // Switching to Select Mode
        if (availableModels.value.length === 0) {
          fetchModels().catch(e => message.error(e.message))
        }
        isManualInput.value = false
      } else {
        isManualInput.value = true
      }
    }

    const handleToggleAddMode = () => {
      if (isAddManualInput.value) {
        // Switching to Select Mode
        if (availableModels.value.length === 0) {
          fetchModels().catch(e => message.error(e.message))
        }
        isAddManualInput.value = false
      } else {
        isAddManualInput.value = true
      }
    }

    // Columns Definition
    const columns = [
      { 
        title: '模型名称', 
        key: 'label', 
        width: 200,
        render(row) {
          if (row.isNew) {
            return h(NInput, {
              value: addForm.label,
              onUpdateValue: (v) => addForm.label = v,
              placeholder: '输入名称',
              autofocus: true,
              clearable: true
            })
          }
          if (row.key === editingKey.value) {
            return h(NInput, {
              value: editForm.label,
              onUpdateValue: (v) => editForm.label = v,
              placeholder: '输入名称',
              clearable: true
            })
          }
          return row.label
        }
      },
      { 
        title: '模型 ID (Key)', 
        key: 'key', 
        width: 300,
        render(row) {
          if (row.isNew) {
             return h('div', { class: 'flex gap-1 items-center' }, [
                isAddManualInput.value 
                  ? h(NInput, {
                      value: addForm.key,
                      onUpdateValue: (v) => addForm.key = v,
                      placeholder: '输入模型 ID',
                      class: 'flex-1',
                      clearable: true
                    })
                  : h(NSelect, {
                      value: addForm.key,
                      onUpdateValue: (v) => addForm.key = v,
                      options: idOptions.value,
                      loading: isFetchingModels.value,
                      filterable: true,
                      tag: true,
                      placeholder: '从列表选择 ID',
                      class: 'flex-1',
                      clearable: true
                    }),
                 h(NButton, {
                    circle: true,
                    size: 'tiny',
                    type: isAddManualInput.value ? 'primary' : 'default',
                    onClick: handleToggleAddMode
                  }, { icon: () => h(NIcon, null, { default: () => h(isAddManualInput.value ? CheckmarkOutline : CloseOutline) }) })
             ])
          }
          if (row.key === editingKey.value) {
            // Edit Mode: Input or Select
            return h('div', { class: 'flex gap-1 items-center' }, [
              isManualInput.value 
                ? h(NInput, {
                    value: editForm.key,
                    onUpdateValue: (v) => editForm.key = v,
                    placeholder: '输入模型 ID',
                    class: 'flex-1',
                    clearable: true
                  })
                : h(NSelect, {
                    value: editForm.key,
                    onUpdateValue: (v) => editForm.key = v,
                    options: idOptions.value,
                    loading: isFetchingModels.value,
                    filterable: true,
                    tag: true,
                    placeholder: '选择 ID',
                    class: 'flex-1',
                    clearable: true
                  }),
              // Toggle Button
               h(NTooltip, { trigger: 'hover' }, {
                 trigger: () => h(NButton, {
                    circle: true,
                    size: 'tiny',
                    type: isManualInput.value ? 'primary' : 'default',
                    onClick: handleToggleEditMode
                  }, { icon: () => h(NIcon, null, { default: () => h(isManualInput.value ? CheckmarkOutline : CreateOutline) }) }),
                  default: () => isManualInput.value ? '切换选择' : '切换手动输入'
               })
            ])
          }
          return row.key
        }
      },
      { 
        title: '类型', 
        key: 'isCustom', 
        width: 100,
        render(row) {
          if (row.isNew) return h(NTag, { type: 'info', size: 'small' }, () => '新增')
          return row.isCustom 
            ? h(NTag, { type: 'warning', size: 'small' }, () => '自定义')
            : h(NTag, { type: 'success', size: 'small' }, () => '官方')
        }
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        fixed: 'right',
        render(row) {
          if (row.isNew) {
             return h(NSpace, null, {
                default: () => [
                  h(NButton, { size: 'small', type: 'primary', onClick: saveAdd }, { default: () => '确认' }),
                  h(NButton, { size: 'small', onClick: cancelAdd }, { default: () => '取消' })
                ]
             })
          }
          if (row.key === editingKey.value) {
            return h(NSpace, null, {
              default: () => [
                h(NButton, { size: 'small', type: 'primary', onClick: () => saveEdit(row.key) }, { default: () => '保存' }),
                h(NButton, { size: 'small', onClick: cancelEdit }, { default: () => '取消' })
              ]
            })
          }
          return h(NSpace, null, {
            default: () => [
              h(NButton, { size: 'small', onClick: () => startEdit(row) }, { default: () => '编辑' }),
              h(NPopconfirm, {
                onPositiveClick: () => handleDelete(row)
              }, {
                trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
                default: () => '确定要删除该模型配置吗？'
              })
            ]
          })
        }
      }
    ]

    return () => h('div', [
      // Table
      props.models.length === 0 && !isAdding.value
        ? h('div', { class: 'flex justify-center p-8' }, 
            h(NButton, { type: 'primary', dashed: true, onClick: startAdd }, { 
              icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
              default: () => '暂无配置，点击新增' 
            })
          )
        : h(NDataTable, {
            columns,
            data: isAdding.value ? [{ key: '_new_', label: '', isNew: true }, ...props.models] : props.models,
            pagination: { pageSize: 10 },
            maxHeight: 500,
            // Custom render for adding row if it's the first row and isAdding is true
            rowProps: (row) => {
               if (row.isNew) return { style: 'background-color: var(--bg-tertiary)' }
            }
          }),
       
       // Floating Add Button (if not empty and not adding)
       (props.models.length > 0 && !isAdding.value) && 
         h('div', { class: 'mt-4 flex justify-center' }, 
           h(NButton, { type: 'primary', dashed: true, class: 'w-full', onClick: startAdd }, { 
             icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
             default: () => '新增模型配置' 
           })
         )
    ])
  }
})
</script>
