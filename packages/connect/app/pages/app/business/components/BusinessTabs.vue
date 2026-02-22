<i18n src="../business.json"></i18n>
<script lang="ts" setup>
interface Tab {
  label: string
  value: string
  icon?: string
}

interface Props {
  tabs: Tab[]
  modelValue: string
}

interface Emits {
  'update:modelValue': [value: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedTab = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleTabClick = (tab: Tab) => {
  selectedTab.value = tab.value
}
</script>

<template>
  <div class="w-full">
    <!-- Tab Headers -->
    <div class="flex items-center justify-center mb-6">
      <div class="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-1">
        <div v-for="tab in tabs" :key="tab.value"
          class="relative flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-all duration-200"
          :class="[
            selectedTab === tab.value
              ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400 font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
          ]" @click="handleTabClick(tab)">
          <UIcon v-if="tab.icon" :name="tab.icon" class="w-4 h-4" />
          <span class="text-sm">{{ tab.label }}</span>
          <div v-if="selectedTab === tab.value"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="animate-in fade-in duration-300">
      <slot :selectedTab="selectedTab" />
    </div>
  </div>
</template>
