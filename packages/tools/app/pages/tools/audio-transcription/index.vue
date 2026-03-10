<i18n src="./index.json"></i18n>
<script lang="ts" setup>
/**
 *
 * Audio Transcription Tool - Convert speech to text with timestamps using AI
 *
 * @author Ismael Garcia <leamsigc@leamsigc.com>
 * @version 0.0.1
 *
 * @todo [ ] Test the component
 * @todo [ ] Integration test.
 * @todo [✔] Update the typescript.
 */


const { t } = useI18n()

onMounted(() => {
  loadModel('timestamped' as ModelKey)
})

const {
  isModelLoaded,
  currentModel,
  currentLanguage,
  modelProgress,
  files,
  isProcessing,
  AVAILABLE_MODELS,
  LANGUAGES,
  loadModel,
  addFiles,
  removeFile,
  clearFiles,
  transcribeFile,
  transcribeAll,
  getTranscriptionText,
  getTranscriptionJson,
  downloadTranscription
} = useTranscription()

const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFileId = ref<string | null>(null)
const copiedId = ref<string | null>(null)
const activeTab = ref('text')

const selectedFile = computed(() =>
  files.value.find(f => f.id === selectedFileId.value) || null
)

const modelOptions = computed(() =>
  Object.entries(AVAILABLE_MODELS).map(([key, value]) => ({
    value: key,
    label: key,
    description: value.size
  }))
)

const languageOptions = computed(() =>
  LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.name
  }))
)

const completedCount = computed(() => files.value.filter(f => f.status === 'done').length)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false

  if (e.dataTransfer?.files) {
    addFiles(e.dataTransfer.files)
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    addFiles(target.files)
    target.value = ''
  }
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const handleModelChange = async (model: string) => {
  await loadModel(model as ModelKey)
}

const copyToClipboard = async (fileId: string) => {
  const text = getTranscriptionText(fileId)
  await navigator.clipboard.writeText(text)
  copiedId.value = fileId
  setTimeout(() => {
    copiedId.value = null
  }, 2000)
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'done': return 'i-lucide-check-circle'
    case 'error': return 'i-lucide-x-circle'
    case 'transcribing': return 'i-lucide-loader-2'
    case 'loading': return 'i-lucide-loader-2'
    default: return 'i-lucide-file-audio'
  }
}

useHead({
  title: t('title'),
  meta: [
    { name: 'description', content: t('description') }
  ]
})

defineOgImage({
  component: 'BlogOgImage',
  props: {
    title: t('title'),
    description: t('description'),
    headline: 'Free Tools',
    imageUrl: '/img/home-dark.png'
  }
})

const resultTabs = [
  { label: 'Text', value: 'text', icon: 'i-lucide-file-text' , slot: 'text' as const },
  { label: 'JSON', value: 'json', icon: 'i-lucide-braces' , slot: 'json' as const },
  { label: 'Timestamps', value: 'timestamps', icon: 'i-lucide-clock' ,  slot: 'timestamps' as const },
]
</script>

<template>
  <div class="min-h-screen bg-background">
    <BaseHeader />
    <div class="container mx-auto px-4 py-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">{{ t('audio_transcription') }}</h1>
        <p class="text-muted-foreground">{{ t('description') }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-7 space-y-6">
          <BaseShinyCard class="w-full">
            <UCard class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6 pb-6 border-b border-border">
                <div class="flex-1 min-w-[200px]">
                  <label class="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {{ t('select_model') }}
                  </label>
                  <USelect v-model="currentModel" :items="modelOptions" value-key="value" label-key="label"
                    :placeholder="t('select_model')" :disabled="isProcessing" @update:model-value="handleModelChange"
                    color="primary" variant="outline" size="lg" class="w-full" />
                </div>
                <div class="flex-1 min-w-[200px]">
                  <label class="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {{ t('select_language') }}
                  </label>
                  <USelect v-model="currentLanguage" :items="languageOptions" value-key="value" label-key="label"
                    :placeholder="t('select_language')" :disabled="isProcessing" color="primary" variant="outline"
                    size="lg" class="w-full" />
                </div>
                <div v-if="isModelLoaded"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
                  <UIcon name="i-lucide-check-circle" />
                  <span>Ready</span>
                </div>
              </div>

              <div :class="[
                'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              ]" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop" @click="openFilePicker">
                <input ref="fileInputRef" type="file" accept="audio/*,video/*" multiple class="hidden"
                  @change="handleFileSelect" />

                <UIcon name="i-lucide-upload" class="text-4xl text-muted-foreground mb-4" />
                <p class="text-lg font-medium mb-2">{{ t('drag_and_drop_audio') }}</p>
                <p class="text-sm text-muted-foreground mb-2">{{ t('or_select_files') }}</p>
                <p class="text-xs text-muted-foreground">{{ t('supported_formats') }}</p>
              </div>

              <div v-if="files.length > 0" class="mt-6 space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">{{ files.length }} file(s)</span>
                  <UButton variant="ghost" size="sm" color="error" :disabled="isProcessing" @click="clearFiles">
                    <UIcon name="i-lucide-trash-2" class="mr-1" />
                    {{ t('clear_all') }}
                  </UButton>
                </div>

                <div class="space-y-2 max-h-80 overflow-y-auto">
                  <div v-for="file in files" :key="file.id" :class="[
                    'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                    selectedFileId === file.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  ]" @click="selectedFileId = file.id">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                      <UIcon :name="getStatusIcon(file.status)" :class="[
                        'flex-shrink-0 text-lg',
                        file.status === 'done' ? 'text-green-500' :
                          file.status === 'error' ? 'text-red-500' :
                            file.status === 'transcribing' ? 'text-primary animate-spin' :
                              'text-muted-foreground'
                      ]" />
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium truncate">{{ file.name }}</p>
                        <p class="text-xs text-muted-foreground">
                          {{ file.status === 'transcribing' ? `${file.progress}%` : t(file.status) }}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <UProgress v-if="file.status === 'transcribing'" :model-value="file.progress" size="xs"
                        color="primary" class="w-24" />
                      <UButton v-if="file.status === 'idle' || file.status === 'error'" size="sm" color="primary"
                        :loading="isProcessing" :disabled="isProcessing" @click.stop="transcribeFile(file.id)">
                        <UIcon name="i-lucide-play" class="mr-1" />
                        Transcribe
                      </UButton>
                      <UButton v-if="file.status === 'done'" size="sm" variant="ghost" color="success"
                        icon="i-lucide-check" />
                      <UButton size="sm" variant="ghost" color="error" icon="i-lucide-x"
                        @click.stop="removeFile(file.id)" />
                    </div>
                  </div>
                </div>

                <UButton block color="primary" size="lg" :loading="isProcessing"
                  :disabled="isProcessing || files.every(f => f.status === 'done')" @click="transcribeAll()">
                  <UIcon name="i-lucide-play" class="mr-2" />
                  {{ isProcessing ? t('transcribing') : t('transcribe_all') }}
                </UButton>
              </div>

              <div v-else class="mt-6 text-center py-8">
                <p class="text-muted-foreground">{{ t('no_files') }}</p>
              </div>
            </UCard>
          </BaseShinyCard>
        </div>

        <div class="lg:col-span-5 space-y-6">
          <BaseShinyCard class="w-full">
            <UCard class="p-6">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-bold">{{ t('result') }}</h3>
                  <div v-if="selectedFile?.result" class="flex gap-1">
                    <UButton size="xs" variant="ghost"
                      :icon="copiedId === selectedFile.id ? 'i-lucide-check' : 'i-lucide-copy'"
                      @click="copyToClipboard(selectedFile.id)">
                      {{ copiedId === selectedFile.id ? t('copied') : t('copy_text') }}
                    </UButton>
                  </div>
                </div>
              </template>

              <div v-if="selectedFile?.result" class="space-y-4">
                <UTabs v-model="activeTab" :items="resultTabs">
                  <template #text="{ item }">
                    <div  class="prose prose-sm max-w-none">
                      <p class="whitespace-pre-wrap leading-relaxed">{{ selectedFile.result?.text }}</p>
                    </div>
                  </template>
                  <template #json="{ item }">
                    <div  class="space-y-3">
                      <div class="bg-muted p-3 rounded-lg overflow-auto max-h-96">
                        <pre class="text-xs font-mono">{{ getTranscriptionJson(selectedFile.id) }}</pre>
                      </div>
                    </div>
                  </template>
                  <template #timestamps="{ item }">
                    <div  class="space-y-1 max-h-96 overflow-y-auto">
                      <div v-for="(chunk, idx) in selectedFile.result?.chunks" :key="idx"
                        class="flex gap-2 text-sm p-2 rounded hover:bg-muted">
                        <span class="text-muted-foreground font-mono whitespace-nowrap text-xs tabular-nums">
                          {{ chunk.start.toFixed(2) }} - {{ chunk.end.toFixed(2) }}
                        </span>
                        <span>{{ chunk.text }}</span>
                      </div>
                    </div>
                  </template>
                </UTabs>

                <div class="flex flex-wrap gap-2 pt-4 border-t">
                  <UButton size="sm" variant="outline" icon="i-lucide-file-text"
                    @click="downloadTranscription(selectedFile.id, 'text')">
                    {{ t('download_text') }}
                  </UButton>
                  <UButton size="sm" variant="outline" icon="i-lucide-braces"
                    @click="downloadTranscription(selectedFile.id, 'json')">
                    {{ t('download_json') }}
                  </UButton>
                  <UButton size="sm" variant="outline" icon="i-lucide-clock"
                    @click="downloadTranscription(selectedFile.id, 'timestamps')">
                    {{ t('download_timestamps') }}
                  </UButton>
                </div>
              </div>

              <div v-else class="text-center py-8 text-muted-foreground">
                <UIcon name="i-lucide-file-audio" class="text-5xl mb-2 opacity-50" />
                <p class="text-sm">{{ t('no_files') }}</p>
              </div>
            </UCard>
          </BaseShinyCard>

          <BaseShinyCard v-if="!isModelLoaded && !isProcessing" class="w-full">
            <UCard class="p-4">
              <div class="text-center">
                <p class="text-sm text-muted-foreground mb-2">{{ t('model_loading') }}</p>
                <UProgress :model-value="modelProgress" />
              </div>
            </UCard>
          </BaseShinyCard>

          <BaseShinyCard v-else-if="isModelLoaded" class="w-full">
            <UCard class="p-4">
              <div class="flex items-center gap-2 text-sm text-green-500">
                <UIcon name="i-lucide-check-circle" />
                <span>{{ t('model_loaded') }}: {{ currentModel }}</span>
              </div>
            </UCard>
          </BaseShinyCard>
        </div>
      </div>
    </div>
  </div>
</template>
