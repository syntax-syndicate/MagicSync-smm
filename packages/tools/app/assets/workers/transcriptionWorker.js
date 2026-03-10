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

const DEVICE_CONFIG = {
  webgpu: {
    dtype: {
      encoder_model: 'fp32',
      decoder_model_merged: 'q4',
    },
    device: 'webgpu',
  },
  wasm: {
    dtype: 'q8',
    device: 'wasm',
  },
}

const TIMESTAMPED_MODEL = 'onnx-community/whisper-base_timestamped'

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
  timestamped: { name: TIMESTAMPED_MODEL, lang: null },
}

let transcriber = null
let currentModel = ''
let currentLanguage = 'en'
let currentDevice = 'webgpu'

async function detectDevice() {
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) return 'webgpu'
    } catch {
      return 'wasm'
    }
  }
  return 'wasm'
}

self.onmessage = async (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'loadModel': {
      try {
        const modelKey = payload.model || 'timestamped'
        const modelConfig = MODELS[modelKey] || MODELS.timestamped
        const model = payload.modelName || modelConfig.name

        currentDevice = await detectDevice()

        self.postMessage({
          type: 'status',
          status: 'loading',
          progress: 0,
          model
        })

        currentModel = model
        currentLanguage = payload.language || modelConfig.lang || 'en'

        transcriber = await pipeline(
          'automatic-speech-recognition',
          model,
          {
            ...DEVICE_CONFIG[currentDevice],
            progress_callback: (progress) => {
              const progressValue = Math.min((progress?.progress ?? 0) * 100, 100)
              self.postMessage({
                type: 'status',
                status: 'loading',
                progress: Math.round(progressValue),
                model
              })
            }
          }
        )

        if (currentDevice === 'webgpu') {
          self.postMessage({
            type: 'status',
            status: 'loading',
            progress: 90,
            model,
            message: 'Compiling shaders and warming up model...'
          })

          await transcriber(new Float32Array(16_000), {
            language: currentLanguage,
          })
        }

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
        const audioData = new Float32Array(audio)

        const chunkLengthSamples = 30 * 16000
        const strideSamples = 5 * 16000

        const totalChunks = Math.ceil(audioData.length / (chunkLengthSamples - strideSamples))
        let fullText = ''
        let fullWords = []
        let fullChunks = []

        for (let i = 0; i < totalChunks; i++) {
          const start = i * (chunkLengthSamples - strideSamples)
          const end = Math.min(start + chunkLengthSamples, audioData.length)
          const chunkAudio = audioData.slice(start, end)

          const progress = Math.round(((i + 1) / totalChunks) * 80)
          self.postMessage({
            type: 'status',
            status: 'transcribing',
            progress
          })

          const result = await transcriber(
            chunkAudio,
            {
              language: targetLanguage,
              return_timestamps: 'word',
              chunk_length_s: 30,
              stride_length_s: 5,
            }
          )

          if (result.text) {
            fullText += result.text + ' '
          }

          if (result.chunks && Array.isArray(result.chunks)) {
            for (const chunk of result.chunks) {
              if (chunk.timestamp) {
                const chunkStart = Array.isArray(chunk.timestamp) ? chunk.timestamp[0] : chunk.timestamp
                const chunkEnd = Array.isArray(chunk.timestamp) ? chunk.timestamp[1] : chunk.timestamp

                fullChunks.push({
                  text: chunk.text?.trim() || '',
                  start: chunkStart + (start / 16000),
                  end: chunkEnd + (start / 16000)
                })
              }
            }
          }

          self.postMessage({
            type: 'partial',
            result: {
              text: fullText.trim(),
              words: fullWords,
              chunks: fullChunks
            }
          })
        }

        const transcription = {
          text: fullText.trim(),
          words: fullWords,
          chunks: fullChunks
        }

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


  function processTranscriptionResult(result, language) {
    const text = result.text || ''
    const words = []
    const chunks = []

    if (result.chunks && Array.isArray(result.chunks)) {
      for (const chunk of result.chunks) {
        if (chunk.timestamp) {
          const start = Array.isArray(chunk.timestamp) ? chunk.timestamp[0] : chunk.timestamp
          const end = Array.isArray(chunk.timestamp) ? chunk.timestamp[1] : chunk.timestamp

          const chunkText = chunk.text ? chunk.text.trim() : ''

          if (chunkText) {
            chunks.push({
              text: chunkText,
              start,
              end
            })

            const chunkWords = extractWordsFromChunk(chunkText, start, end)
            words.push(...chunkWords)
          }
        }
      }
    }

    return { text, words, chunks }
  }

  function extractWordsFromChunk(text, chunkStart, chunkEnd) {
    if (!text) return []

    const words = []
    const cleanText = text.trim()
    if (!cleanText) return []

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

}
