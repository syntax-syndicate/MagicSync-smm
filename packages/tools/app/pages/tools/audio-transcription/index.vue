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
const totalCount = computed(() => files.value.length)

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
		case 'done': return 'i-lucide-check-circle-2'
		case 'error': return 'i-lucide-x-circle'
		case 'transcribing': return 'i-lucide-loader-2'
		case 'loading': return 'i-lucide-loader-2'
		default: return 'i-lucide-waveform'
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
</script>

<template>
	<div class="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
		<!-- Animated Background -->
		<div class="absolute inset-0 overflow-hidden pointer-events-none">
			<div class="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
			<div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;" />
			<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
		</div>

		<BaseHeader />

		<div class="container mx-auto px-4 py-8 relative z-10">
			<!-- Hero Section -->
			<div class="text-center mb-12">
				<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-4">
					<UIcon name="i-lucide-waves" class="animate-pulse" />
					<span>AI-Powered Transcription</span>
				</div>
				<h1 class="text-5xl font-bold text-white mb-4 bg-linear-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent">
					{{ t('audio_transcription') }}
				</h1>
				<p class="text-lg text-neutral-400 max-w-2xl mx-auto">
					{{ t('description') }}
				</p>
			</div>

			<div class="grid grid-cols-1 xl:grid-cols-12 gap-8">
				<!-- Left Panel - Upload & Controls -->
				<div class="xl:col-span-7 space-y-6">
					<!-- Settings Card -->
					<div class="relative group">
						<div class="absolute -inset-0.5 bg-linear-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur" />
						<div class="relative bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-800 p-6">
							<div class="flex flex-wrap items-end gap-4">
								<div class="flex-1 min-w-[200px]">
									<label class="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
										<UIcon name="i-lucide-brain" class="inline mr-1" />{{ t('select_model') }}
									</label>
									<USelect
										v-model="currentModel"
										:items="modelOptions"
										value-key="value"
										label-key="label"
										:placeholder="t('select_model')"
										:disabled="isProcessing"
										@update:model-value="handleModelChange"
										color="primary"
										variant="outline"
										size="lg"
									/>
								</div>
								<div class="flex-1 min-w-[200px]">
									<label class="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
										<UIcon name="i-lucide-languages" class="inline mr-1" />{{ t('select_language') }}
									</label>
									<USelect
										v-model="currentLanguage"
										:items="languageOptions"
										value-key="value"
										label-key="label"
										:placeholder="t('select_language')"
										:disabled="isProcessing"
										color="primary"
										variant="outline"
										size="lg"
									/>
								</div>
								<div v-if="isModelLoaded" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
									<UIcon name="i-lucide-check-circle-2" />
									<span>Ready</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Drop Zone -->
					<div class="relative group">
						<div
							:class="[
								'absolute -inset-0.5 rounded-2xl transition-all duration-500 blur',
								isDragging
									? 'bg-linear-to-r from-cyan-500 to-cyan-400 opacity-60'
									: 'bg-linear-to-r from-neutral-800 to-neutral-700 opacity-0 group-hover:opacity-30'
							]"
						/>
						<div
							:class="[
								'relative backdrop-blur-xl rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden',
								isDragging
									? 'border-cyan-500 bg-cyan-500/5'
									: 'border-neutral-700 hover:border-neutral-600 bg-neutral-900/50'
							]"
							@dragover="handleDragOver"
							@dragleave="handleDragLeave"
							@drop="handleDrop"
							@click="openFilePicker"
						>
							<input
								ref="fileInputRef"
								type="file"
								accept="audio/*,video/*"
								multiple
								class="hidden"
								@change="handleFileSelect"
							/>

							<!-- Animated Waveform Pattern -->
							<div class="absolute inset-0 opacity-5">
								<svg class="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
									<path d="M0 50 Q 50 20, 100 50 T 200 50 T 300 50 T 400 50" fill="none" stroke="currentColor" stroke-width="2">
										<animate attributeName="d" dur="2s" repeatCount="indefinite"
											values="M0 50 Q 50 20, 100 50 T 200 50 T 300 50 T 400 50;
													M0 50 Q 50 80, 100 50 T 200 50 T 300 50 T 400 50;
													M0 50 Q 50 20, 100 50 T 200 50 T 300 50 T 400 50" />
									</path>
								</svg>
							</div>

							<div class="relative p-12 text-center">
								<div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-6">
									<UIcon name="i-lucide-upload" class="text-3xl text-cyan-400" />
								</div>
								<p class="text-xl font-semibold text-white mb-2">{{ t('drag_and_drop_audio') }}</p>
								<p class="text-neutral-400 mb-2">{{ t('or_select_files') }}</p>
								<p class="text-xs text-neutral-500">{{ t('supported_formats') }}</p>
							</div>
						</div>
					</div>

					<!-- File List -->
					<div v-if="files.length > 0" class="relative group">
						<div class="absolute -inset-0.5 bg-linear-to-r from-purple-500/20 to-cyan-500/20 rounded-2xl opacity-20" />
						<div class="relative bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-800 overflow-hidden">
							<!-- Header -->
							<div class="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
								<div class="flex items-center gap-3">
									<UIcon name="i-lucide-files" class="text-neutral-400" />
									<span class="font-medium text-white">{{ files.length }} file(s)</span>
									<span v-if="completedCount > 0" class="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">
										{{ completedCount }} done
									</span>
								</div>
								<UButton
									variant="ghost"
									size="sm"
									color="error"
									:disabled="isProcessing"
									@click="clearFiles"
								>
									<UIcon name="i-lucide-trash-2" class="mr-1" />
									{{ t('clear_all') }}
								</UButton>
							</div>

							<!-- Files -->
							<div class="max-h-80 overflow-y-auto">
								<div
									v-for="file in files"
									:key="file.id"
									:class="[
										'flex items-center justify-between px-6 py-4 border-b border-neutral-800/50 transition-all cursor-pointer',
										selectedFileId === file.id
											? 'bg-cyan-500/10 border-l-2 border-l-cyan-500'
											: 'hover:bg-neutral-800/50 border-l-2 border-l-transparent'
									]"
									@click="selectedFileId = file.id"
								>
									<div class="flex items-center gap-4 flex-1 min-w-0">
										<div :class="[
											'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
											file.status === 'done' ? 'bg-green-500/20 text-green-400' :
											file.status === 'error' ? 'bg-red-500/20 text-red-400' :
											file.status === 'transcribing' ? 'bg-cyan-500/20 text-cyan-400' :
											'bg-neutral-800 text-neutral-400'
										]">
											<UIcon :name="getStatusIcon(file.status)" :class="[
												'text-lg',
												file.status === 'transcribing' && 'animate-spin'
											]" />
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-white truncate">{{ file.name }}</p>
											<p class="text-xs text-neutral-500">
												{{ file.status === 'transcribing' ? `${file.progress}%` : t(file.status) }}
											</p>
										</div>
									</div>

									<div class="flex items-center gap-3">
										<UProgress
											v-if="file.status === 'transcribing'"
											:model-value="file.progress"
											size="xs"
											color="primary"
											class="w-28"
										/>
										<UButton
											v-if="file.status === 'idle' || file.status === 'error'"
											size="sm"
											color="primary"
											:loading="isProcessing"
											:disabled="isProcessing"
											@click.stop="transcribeFile(file.id)"
										>
											<UIcon name="i-lucide-play" class="mr-1" />
											Transcribe
										</UButton>
										<UButton
											v-if="file.status === 'done'"
											size="sm"
											variant="ghost"
											color="success"
											icon="i-lucide-check"
										/>
										<UButton
											size="sm"
											variant="ghost"
											color="error"
											icon="i-lucide-x"
											@click.stop="removeFile(file.id)"
										/>
									</div>
								</div>
							</div>

							<!-- Action -->
							<div class="px-6 py-4 border-t border-neutral-800">
								<UButton
									block
									color="primary"
									size="lg"
									:loading="isProcessing"
									:disabled="isProcessing || files.every(f => f.status === 'done')"
									@click="transcribeAll()"
								>
									<UIcon name="i-lucide-play" class="mr-2" />
									{{ isProcessing ? t('transcribing') : t('transcribe_all') }}
								</UButton>
							</div>
						</div>
					</div>
				</div>

				<!-- Right Panel - Results -->
				<div class="xl:col-span-5 space-y-6">
					<div class="relative group h-full">
						<div class="absolute -inset-0.5 bg-linear-to-r from-purple-500 to-cyan-500 rounded-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 blur" />
						<div class="relative bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-800 h-full min-h-[500px] flex flex-col">
							<!-- Header -->
							<div class="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
								<div class="flex items-center gap-2">
									<UIcon name="i-lucide-file-text" class="text-cyan-400" />
									<h3 class="font-semibold text-white">{{ t('result') }}</h3>
								</div>
								<div v-if="selectedFile?.result" class="flex gap-1">
									<UButton
										size="xs"
										variant="ghost"
										:icon="copiedId === selectedFile.id ? 'i-lucide-check' : 'i-lucide-copy'"
										@click="copyToClipboard(selectedFile.id)"
									>
										{{ copiedId === selectedFile.id ? t('copied') : t('copy_text') }}
									</UButton>
								</div>
							</div>

							<!-- Content -->
							<div v-if="selectedFile?.result" class="flex-1 flex flex-col overflow-hidden p-6">
								<!-- Tabs -->
								<div class="flex gap-2 mb-4">
									<button
										v-for="tab in [
											{ value: 'text', label: 'Text', icon: 'i-lucide-file-text' },
											{ value: 'json', label: 'JSON', icon: 'i-lucide-braces' },
											{ value: 'timestamps', label: 'Timestamps', icon: 'i-lucide-clock' }
										]"
										:key="tab.value"
										@click="activeTab = tab.value"
										:class="[
											'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
											activeTab === tab.value
												? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
												: 'text-neutral-400 hover:text-white hover:bg-neutral-800'
										]"
									>
										<UIcon :name="tab.icon" />
										{{ tab.label }}
									</button>
								</div>

								<!-- Text View -->
								<div v-if="activeTab === 'text'" class="flex-1 overflow-y-auto">
									<div class="prose prose-invert prose-sm max-w-none">
										<p class="whitespace-pre-wrap text-neutral-200 leading-relaxed">{{ selectedFile.result?.text }}</p>
									</div>
								</div>

								<!-- JSON View -->
								<div v-else-if="activeTab === 'json'" class="flex-1 overflow-y-auto">
									<div class="bg-neutral-950 p-4 rounded-lg overflow-auto max-h-96 border border-neutral-800">
										<pre class="text-xs text-cyan-300 font-mono">{{ getTranscriptionJson(selectedFile.id) }}</pre>
									</div>
								</div>

								<!-- Timestamps View -->
								<div v-else class="flex-1 overflow-y-auto space-y-1">
									<div
										v-for="(chunk, idx) in selectedFile.result?.chunks"
										:key="idx"
										class="flex gap-3 p-2 rounded hover:bg-neutral-800/50 transition-colors"
									>
										<span class="text-cyan-400 font-mono whitespace-nowrap text-xs tabular-nums">
											{{ chunk.start.toFixed(2) }}s
										</span>
										<span class="text-neutral-300 text-sm">{{ chunk.text }}</span>
									</div>
								</div>

								<!-- Download Actions -->
								<div class="flex flex-wrap gap-2 pt-4 mt-4 border-t border-neutral-800">
									<UButton
										size="sm"
										variant="outline"
										color="primary"
										icon="i-lucide-file-text"
										@click="downloadTranscription(selectedFile.id, 'text')"
									>
										{{ t('download_text') }}
									</UButton>
									<UButton
										size="sm"
										variant="outline"
										color="purple"
										icon="i-lucide-braces"
										@click="downloadTranscription(selectedFile.id, 'json')"
									>
										{{ t('download_json') }}
									</UButton>
									<UButton
										size="sm"
										variant="outline"
										color="neutral"
										icon="i-lucide-clock"
										@click="downloadTranscription(selectedFile.id, 'timestamps')"
									>
										{{ t('download_timestamps') }}
									</UButton>
								</div>
							</div>

							<!-- Empty State -->
							<div v-else class="flex-1 flex flex-col items-center justify-center p-12 text-center">
								<div class="w-24 h-24 rounded-2xl bg-neutral-800/50 flex items-center justify-center mb-6">
									<UIcon name="i-lucide-waveform" class="text-5xl text-neutral-600" />
								</div>
								<p class="text-neutral-400 mb-2">No transcription selected</p>
								<p class="text-xs text-neutral-600">Upload and transcribe audio files to see results here</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
@keyframes waveform {
	0%, 100% { transform: scaleY(0.5); }
	50% { transform: scaleY(1); }
}

.animate-waveform {
	animation: waveform 1s ease-in-out infinite;
}

::-webkit-scrollbar {
	width: 6px;
	height: 6px;
}

::-webkit-scrollbar-track {
	background: transparent;
}

::-webkit-scrollbar-thumb {
	background: #3f3f46;
	border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
	background: #52525b;
}
</style>
