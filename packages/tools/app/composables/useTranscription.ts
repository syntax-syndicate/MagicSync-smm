/**
 *
 * Composable for Audio Transcription using Whisper
 * Handles model loading, file management, and transcription with timestamps
 *
 * @author Ismael Garcia <leamsigc@leamsigc.com>
 * @version 0.0.1
 *
 * @todo [ ] Test the component
 * @todo [ ] Integration test.
 * @todo [✔] Update the typescript.
 */

export type TranscriptionStatus = 'idle' | 'loading' | 'loaded' | 'transcribing' | 'done' | 'error' | 'unloaded'

export type WordTimestamp = {
	word: string
	start: number
	end: number
	score: number
}

export type TranscriptionResult = {
	text: string
	words: WordTimestamp[]
	chunks: Array<{
		text: string
		start: number
		end: number
	}>
}

export type TranscriptionFile = {
	id: string
	name: string
	file: File
	status: TranscriptionStatus
	progress: number
	result: TranscriptionResult | null
	error: string | null
}

export type ModelKey = 'tiny' | 'tinyEn' | 'base' | 'baseEn' | 'small' | 'smallEn' | 'medium' | 'mediumEn' | 'large' | 'largeV2' | 'largeV3'

export const AVAILABLE_MODELS: Record<ModelKey, { name: string; lang: string; size: string }> = {
	tiny: { name: 'Xenova/whisper-tiny', lang: 'en', size: '39 MB' },
	tinyEn: { name: 'Xenova/whisper-tiny.en', lang: 'en', size: '39 MB' },
	base: { name: 'Xenova/whisper-base', lang: 'en', size: '74 MB' },
	baseEn: { name: 'Xenova/whisper-base.en', lang: 'en', size: '74 MB' },
	small: { name: 'Xenova/whisper-small', lang: 'en', size: '244 MB' },
	smallEn: { name: 'Xenova/whisper-small.en', lang: 'en', size: '244 MB' },
	medium: { name: 'Xenova/whisper-medium', lang: 'en', size: '769 MB' },
	mediumEn: { name: 'Xenova/whisper-medium.en', lang: 'en', size: '769 MB' },
	large: { name: 'Xenova/whisper-large', lang: 'en', size: '1550 MB' },
	largeV2: { name: 'Xenova/whisper-large-v2', lang: 'en', size: '1550 MB' },
	largeV3: { name: 'Xenova/whisper-large-v3', lang: 'en', size: '1550 MB' },
}

export const SUPPORTED_AUDIO_FORMATS = [
	'audio/mpeg',
	'audio/wav',
	'audio/ogg',
	'audio/webm',
	'audio/mp4',
	'audio/x-m4a',
	'audio/m4a',
	'audio/flac',
	'audio/aac',
	'audio/x-wav',
	'video/mp4',
	'video/webm',
	'video/quicktime',
]

export const LANGUAGES = [
	{ code: 'en', name: 'English' },
	{ code: 'es', name: 'Spanish' },
	{ code: 'fr', name: 'French' },
	{ code: 'de', name: 'German' },
	{ code: 'it', name: 'Italian' },
	{ code: 'pt', name: 'Portuguese' },
	{ code: 'ru', name: 'Russian' },
	{ code: 'zh', name: 'Chinese' },
	{ code: 'ja', name: 'Japanese' },
	{ code: 'ko', name: 'Korean' },
	{ code: 'ar', name: 'Arabic' },
	{ code: 'hi', name: 'Hindi' },
	{ code: 'nl', name: 'Dutch' },
	{ code: 'pl', name: 'Polish' },
	{ code: 'tr', name: 'Turkish' },
	{ code: 'vi', name: 'Vietnamese' },
	{ code: 'th', name: 'Thai' },
	{ code: 'sv', name: 'Swedish' },
	{ code: 'da', name: 'Danish' },
	{ code: 'fi', name: 'Finnish' },
	{ code: 'no', name: 'Norwegian' },
	{ code: 'cs', name: 'Czech' },
	{ code: 'el', name: 'Greek' },
	{ code: 'he', name: 'Hebrew' },
	{ code: 'id', name: 'Indonesian' },
	{ code: 'ms', name: 'Malay' },
	{ code: 'ro', name: 'Romanian' },
	{ code: 'sk', name: 'Slovak' },
	{ code: 'uk', name: 'Ukrainian' },
	{ code: 'hu', name: 'Hungarian' },
]

export const useTranscription = () => {
	const workerRef = ref<Worker | null>(null)
	const isModelLoaded = ref(false)
	const currentModel = ref<ModelKey>('tiny')
	const currentLanguage = ref('en')
	const modelProgress = ref(0)

	const files = ref<TranscriptionFile[]>([])
	const isProcessing = ref(false)

	const initWorker = () => {
		if (workerRef.value) return

		workerRef.value = new Worker(
			new URL('../assets/workers/transcriptionWorker.js', import.meta.url),
			{ type: 'module' }
		)

		workerRef.value.onmessage = handleWorkerMessage
		workerRef.value.onerror = (error) => {
			console.error('Worker error:', error)
		}
	}

	const handleWorkerMessage = (event: MessageEvent) => {
		const { type, status, progress, result, error, model } = event.data

		switch (type) {
			case 'status':
				modelProgress.value = progress
				if (status === 'loaded') {
					isModelLoaded.value = true
					currentModel.value = model
				} else if (status === 'unloaded') {
					isModelLoaded.value = false
				} else if (status === 'error') {
					isModelLoaded.value = false
				}
				break

			case 'result':
				if (result) {
					const currentFile = files.value.find(f => f.status === 'transcribing')
					if (currentFile) {
						currentFile.status = 'done'
						currentFile.progress = 100
						currentFile.result = result
						currentFile.error = null
					}
				}
				isProcessing.value = false
				break

			case 'error':
				if (error) {
					const currentFile = files.value.find(f => f.status === 'transcribing')
					if (currentFile) {
						currentFile.status = 'error'
						currentFile.error = error
					}
				}
				isProcessing.value = false
				break
		}
	}

	const loadModel = async (modelKey: ModelKey = 'tiny') => {
		initWorker()

		if (!workerRef.value) return

		const modelConfig = AVAILABLE_MODELS[modelKey] || AVAILABLE_MODELS.tiny

		workerRef.value.postMessage({
			type: 'loadModel',
			payload: {
				model: modelKey,
				modelName: modelConfig.name,
				language: modelConfig.lang
			}
		})
	}

	const unloadModel = () => {
		if (!workerRef.value) return

		workerRef.value.postMessage({
			type: 'unloadModel',
			payload: {}
		})
	}

	const addFiles = (newFiles: FileList | File[]) => {
		const fileArray = Array.from(newFiles)

		for (const file of fileArray) {
			const fileType = file.type || ''
			const isValidFormat = SUPPORTED_AUDIO_FORMATS.some(format => {
				const formatType = format.split('/')[1]
				return formatType && (fileType.includes(formatType) || fileType === format)
			})

			if (!isValidFormat) {
				console.warn(`Skipping file ${file.name}: unsupported format ${file.type}`)
				continue
			}

			const transcriptionFile: TranscriptionFile = {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				name: file.name,
				file,
				status: 'idle',
				progress: 0,
				result: null,
				error: null
			}

			files.value.push(transcriptionFile)
		}
	}

	const removeFile = (id: string) => {
		const index = files.value.findIndex(f => f.id === id)
		if (index !== -1) {
			files.value.splice(index, 1)
		}
	}

	const clearFiles = () => {
		files.value = []
	}

	const transcribeFile = async (fileId: string, language?: string) => {
		const file = files.value.find(f => f.id === fileId)
		if (!file || !workerRef.value) return

		if (!isModelLoaded.value) {
			await loadModel(currentModel.value)
		}

		file.status = 'transcribing'
		file.progress = 0
		isProcessing.value = true

		const arrayBuffer = await file.file.arrayBuffer()
		const audioData = new Float32Array(new Float32Array(arrayBuffer))

		workerRef.value.postMessage({
			type: 'transcribe',
			payload: {
				audio: audioData,
				language: language || currentLanguage.value,
				model: currentModel.value
			}
		})
	}

	const transcribeAll = async (language?: string) => {
		const pendingFiles = files.value.filter(f => f.status === 'idle' || f.status === 'error')

		for (const file of pendingFiles) {
			await transcribeFile(file.id, language)
			await new Promise(resolve => setTimeout(resolve, 500))
		}
	}

	const getTranscriptionText = (fileId: string): string => {
		const file = files.value.find(f => f.id === fileId)
		return file?.result?.text || ''
	}

	const getTranscriptionJson = (fileId: string): string => {
		const file = files.value.find(f => f.id === fileId)
		if (!file?.result) return ''

		return JSON.stringify(file.result, null, 2)
	}

	const getTranscriptionWithTimestamps = (fileId: string): string => {
		const file = files.value.find(f => f.id === fileId)
		if (!file?.result) return ''

		const lines: string[] = []
		for (const chunk of file.result.chunks) {
			const startTime = formatTimestamp(chunk.start)
			const endTime = formatTimestamp(chunk.end)
			lines.push(`[${startTime} -> ${endTime}] ${chunk.text}`)
		}

		return lines.join('\n')
	}

	const formatTimestamp = (seconds: number): string => {
		const hrs = Math.floor(seconds / 3600)
		const mins = Math.floor((seconds % 3600) / 60)
		const secs = Math.floor(seconds % 60)
		const ms = Math.round((seconds % 1) * 1000)

		if (hrs > 0) {
			return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
		}
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
	}

	const downloadTranscription = (fileId: string, format: 'text' | 'json' | 'timestamps') => {
		const file = files.value.find(f => f.id === fileId)
		if (!file?.result) return

		let content: string
		let mimeType: string
		let extension: string

		switch (format) {
			case 'json':
				content = JSON.stringify(file.result, null, 2)
				mimeType = 'application/json'
				extension = 'json'
				break
			case 'timestamps':
				content = getTranscriptionWithTimestamps(fileId)
				mimeType = 'text/plain'
				extension = 'txt'
				break
			default:
				content = file.result.text
				mimeType = 'text/plain'
				extension = 'txt'
		}

		const blob = new Blob([content], { type: mimeType })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${file.name.replace(/\.[^/.]+$/, '')}_transcription.${extension}`
		a.click()
		URL.revokeObjectURL(url)
	}

	const cleanup = () => {
		if (workerRef.value) {
			workerRef.value.terminate()
			workerRef.value = null
		}
		isModelLoaded.value = false
		files.value = []
	}

	onUnmounted(() => {
		cleanup()
	})

	return {
		workerRef: readonly(workerRef),
		isModelLoaded: readonly(isModelLoaded),
		currentModel: readonly(currentModel),
		currentLanguage: readonly(currentLanguage),
		modelProgress: readonly(modelProgress),
		files: readonly(files),
		isProcessing: readonly(isProcessing),
		AVAILABLE_MODELS,
		SUPPORTED_AUDIO_FORMATS,
		LANGUAGES,
		loadModel,
		unloadModel,
		addFiles,
		removeFile,
		clearFiles,
		transcribeFile,
		transcribeAll,
		getTranscriptionText,
		getTranscriptionJson,
		getTranscriptionWithTimestamps,
		downloadTranscription,
		formatTimestamp,
		cleanup
	}
}
