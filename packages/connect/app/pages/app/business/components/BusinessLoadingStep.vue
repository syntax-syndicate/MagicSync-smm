<i18n src="../business.json"></i18n>
<script lang="ts" setup>
import type { Step } from './MultiStepLoader.vue'
import MultiStepLoader from './MultiStepLoader.vue'
import { useI18n } from 'vue-i18n'

interface Props {
  steps: Step[]
  loading: boolean
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const { t } = useI18n()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const handleClose = () => {
  isVisible.value = false
  emit('close')
}
</script>

<template>
  <UModal v-model="isVisible" :overlay="true" class="!items-start">
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto w-full">
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
          {{ t('wizard.title') }}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ t('wizard.subtitle_step2') }}
        </p>
      </div>

      <MultiStepLoader :steps="steps" :loading="loading" @close="handleClose" />
    </div>
  </UModal>
</template>
