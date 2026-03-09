/**
 *
 * Web Worker for Audio Transcription using Whisper via Transformers.js
 * Handles audio transcription with word-level timestamps and progress reporting
 *
 * @author Ismael Garcia <leamsigc@leamsigc.com>
 * @version 0.0.1
 *
 * Messages:
 * - loadModel: Load Whisper model
 * - transcribe: Transcribe audio file
 * - unloadModel: Unload current model
 */

import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
env.useBrowserCache = true

const MODELS = {
	tiny: { name: 'Xenova/whisper-tiny', lang: 'en' },
	tinyEn: { name: 'Xenova/whisper-tiny.en', lang: 'en' },
	base: { name: 'Xenova/whisper-base', lang: 'en' },
	baseEn: { name: 'Xenova/whisper-base.en', lang: 'en' },
	small: { name: 'Xenova/whisper-small', lang: 'en' },
	smallEn: { name: 'Xenova/whisper-small.en', lang: 'en' },
	medium: { name: 'Xenova/whisper-medium', lang: 'en' },
	mediumEn: { name: 'Xenova/whisper-medium.en', lang: 'en' },
	large: { name: 'Xenova/whisper-large', lang: 'en' },
	largeV2: { name: 'Xenova/whisper-large-v2', lang: 'en' },
	largeV3: { name: 'Xenova/whisper-large-v3', lang: 'en' },
}

let transcriber = null
let currentModel = ''
let currentLanguage = 'en'

self.onmessage = async (event) => {
	const { type, payload } = event.data

	switch (type) {
		case 'loadModel': {
			try {
				const modelKey = payload.model || 'tiny'
				const modelConfig = MODELS[modelKey] || MODELS.tiny
				const model = payload.modelName || modelConfig.name

				self.postMessage({
					type: 'status',
					status: 'loading',
					progress: 0,
					model
				})

				currentModel = model
				currentLanguage = payload.language || modelConfig.lang

				transcriber = await pipeline(
					'automatic-speech-recognition',
					model,
					{
						progress_callback: (progress) => {
							self.postMessage({
								type: 'status',
								status: 'loading',
								progress: Math.round(progress.progress * 100),
								model
							})
						}
					}
				)

				self.postMessage({
					type: 'status',
					status: 'loaded',
					progress: 100,
					model
				})
			} catch (error) {
				self.postMessage({
					type: 'error',
					error: error.message
				})
			}
			break
		}

		case 'transcribe': {
			if (!transcriber) {
				self.postMessage({ type: 'error', error: 'Model not loaded' })
				return
			}

			try {
				self.postMessage({
					type: 'status',
					status: 'transcribing',
					progress: 0
				})

				const { audio, language } = payload
				const targetLanguage = language || currentLanguage

				self.postMessage({
					type: 'status',
					status: 'transcribing',
					progress: 10
				})

				const audioData = new Float32Array(audio)

				const result = await transcriber(audioData, {
					language: targetLanguage,
					return_timestamps: true,
					temperature: 0,
				}, (progress) => {
					const mappedProgress = 10 + Math.round(progress.progress * 80)
					self.postMessage({
						type: 'status',
						status: 'transcribing',
						progress: mappedProgress
					})
				})

				const transcription = processTranscriptionResult(result, targetLanguage)

				self.postMessage({
					type: 'status',
					status: 'done',
					progress: 100
				})

				self.postMessage({
					type: 'result',
					result: transcription
				})
			} catch (error) {
				self.postMessage({
					type: 'error',
					error: error.message
				})
			}
			break
		}

		case 'unloadModel': {
			transcriber = null
			currentModel = ''
			self.postMessage({
				type: 'status',
				status: 'unloaded',
				progress: 100
			})
			break
		}

		default: {
			self.postMessage({
				type: 'error',
				error: 'Unknown message type'
			})
			break
		}
	}
}

function processTranscriptionResult(result, _language) {
	const text = result.text || ''

	const words = []
	const chunks = []

	if (result.chunks && Array.isArray(result.chunks)) {
		for (const chunk of result.chunks) {
			if (chunk.timestamp) {
				const start = Array.isArray(chunk.timestamp) ? chunk.timestamp[0] : chunk.timestamp
				const end = Array.isArray(chunk.timestamp) ? chunk.timestamp[1] : chunk.timestamp

				chunks.push({
					text: chunk.text ? chunk.text.trim() : '',
					start,
					end
				})

				const chunkWords = extractWordsFromChunk(chunk.text, start, end)
				words.push(...chunkWords)
			}
		}
	}

	return { text, words, chunks }
}

function extractWordsFromChunk(text, chunkStart, chunkEnd) {
	if (!text) return []

	const words = []
	const cleanText = text.trim()

	const wordMatches = cleanText.matchAll(/(\S+)/g)
	const totalChars = cleanText.length

	for (const match of wordMatches) {
		const word = match[1]
		const wordStart = match.index || 0
		const wordEnd = wordStart + word.length

		const startRatio = wordStart / totalChars
		const endRatio = wordEnd / totalChars

		const start = chunkStart + (startRatio * (chunkEnd - chunkStart))
		const end = chunkStart + (endRatio * (chunkEnd - chunkStart))

		words.push({
			word: word.replace(/[^\w''-]/g, ''),
			start: Math.round(start * 100) / 100,
			end: Math.round(end * 100) / 100,
			score: 0.9
		})
	}

	return words
}
