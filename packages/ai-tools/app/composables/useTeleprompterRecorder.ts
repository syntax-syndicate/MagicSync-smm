export type TeleprompterWord = {
  word: string
  startTime: number
  endTime: number
  lineIndex: number
  wordIndexInLine: number
}

export type SubtitlePosition = 'top' | 'middle' | 'bottom'
export type SubtitleStyle = {
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  backgroundColor: string
  backgroundOpacity: number
  borderColor: string
  borderWidth: number
  borderRadius: number
  padding: number
}

export type TeleprompterSettings = {
  subtitlePosition: SubtitlePosition
  activeWord: SubtitleStyle
  inactiveWord: SubtitleStyle
  nextLine: SubtitleStyle
  showNextLine: boolean
}

const defaultSubtitleStyle: SubtitleStyle = {
  color: '#ffffff',
  fontFamily: 'sans-serif',
  fontSize: 48,
  fontWeight: 'bold',
  shadowColor: 'rgba(0, 0, 0, 0.8)',
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 8,
  padding: 12
}

const defaultInactiveStyle: SubtitleStyle = {
  ...defaultSubtitleStyle,
  color: 'rgba(255, 255, 255, 0.3)',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0
}

const defaultNextLineStyle: SubtitleStyle = {
  ...defaultSubtitleStyle,
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: 24,
  fontWeight: 'normal',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0
}

export const useTeleprompterRecorder = () => {
  const scriptContent = ref('')
  const speedMultiplier = ref(1.0)
  const isRecording = ref(false)
  const timer = ref(0)
  
  const settings = reactive<TeleprompterSettings & { showSettings: boolean }>({
    subtitlePosition: 'bottom',
    activeWord: { ...defaultSubtitleStyle },
    inactiveWord: { ...defaultInactiveStyle },
    nextLine: { ...defaultNextLineStyle },
    showNextLine: true,
    showSettings: false
  })
  
  const WORDS_PER_LINE = 8
  
  const words = computed(() =>
    scriptContent.value.split(/\s+/).filter((w: string) => w.trim() !== '')
  )
  
  const lines = computed(() => {
    const result: string[][] = []
    for (let i = 0; i < words.value.length; i += WORDS_PER_LINE) {
      result.push(words.value.slice(i, i + WORDS_PER_LINE))
    }
    return result
  })
  
  const wordTimings = computed<TeleprompterWord[]>(() => {
    const timings: TeleprompterWord[] = []
    let currentTime = 0
    
    for (let i = 0; i < words.value.length; i++) {
      const word = words.value[i]
      if (!word) continue
      const lengthFactor = Math.max(0.5, Math.min(2, word.length / 5))
      let duration = 350 * lengthFactor
      if (word.match(/[.,!?:]$/)) duration += 400
      duration = duration / speedMultiplier.value
      
      const lineIndex = Math.floor(i / WORDS_PER_LINE)
      const wordIndexInLine = i % WORDS_PER_LINE
      
      timings.push({
        word,
        startTime: currentTime,
        endTime: currentTime + duration,
        lineIndex,
        wordIndexInLine
      })
      
      currentTime += duration
    }
    
    return timings
  })
  
  const currentWordIndex = computed(() => {
    if (!isRecording.value) return 0
    const currentTime = timer.value * 1000
    
    for (let i = wordTimings.value.length - 1; i >= 0; i--) {
      const timing = wordTimings.value[i]
      if (timing && currentTime >= timing.startTime) {
        return i
      }
    }
    return 0
  })
  
  const currentLineIndex = computed(() => Math.floor(currentWordIndex.value / WORDS_PER_LINE))
  
  const currentLine = computed(() => lines.value[currentLineIndex.value] ?? [])
  const nextLine = computed(() => lines.value[currentLineIndex.value + 1] ?? [])
  
  const activeWord = computed(() => wordTimings.value[currentWordIndex.value]?.word ?? '')
  
  const activeLineWords = computed(() => {
    const startIdx = currentLineIndex.value * WORDS_PER_LINE
    return wordTimings.value.slice(startIdx, startIdx + WORDS_PER_LINE)
  })
  
  const getPositionY = (canvas: HTMLCanvasElement, position: SubtitlePosition, fontSize: number, padding: number): number => {
    switch (position) {
      case 'top':
        return padding + fontSize
      case 'middle':
        return canvas.height / 2
      case 'bottom':
      default:
        return canvas.height - padding - fontSize * 2
    }
  }
  
  const applyStyle = (
    ctx: CanvasRenderingContext2D,
    style: SubtitleStyle,
    canvas: HTMLCanvasElement,
    _isActive: boolean,
    text: string
  ) => {
    const baseFontSize = style.fontSize || canvas.height * 0.06
    ctx.font = `${style.fontWeight} ${baseFontSize}px ${style.fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    if (style.backgroundOpacity > 0) {
      ctx.fillStyle = style.backgroundColor
      ctx.globalAlpha = style.backgroundOpacity / 100
      const textWidth = ctx.measureText(text).width
      const bgX = canvas.width / 2 - textWidth / 2 - style.padding
      const bgY = getPositionY(canvas, settings.subtitlePosition, baseFontSize, style.padding) - baseFontSize / 2 - style.padding
      const bgWidth = textWidth + style.padding * 2
      const bgHeight = baseFontSize + style.padding * 2
      
      if (style.borderWidth > 0 && style.borderColor !== 'transparent') {
        ctx.strokeStyle = style.borderColor
        ctx.lineWidth = style.borderWidth
        ctx.beginPath()
        ctx.roundRect(bgX, bgY, bgWidth, bgHeight, style.borderRadius)
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight)
      }
      ctx.globalAlpha = 1
    }
    
    ctx.fillStyle = style.color
    
    if (style.shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor
      ctx.shadowBlur = style.shadowBlur
      ctx.shadowOffsetX = style.shadowOffsetX
      ctx.shadowOffsetY = style.shadowOffsetY
    }
    
    return { baseFontSize }
  }
  
  const drawSubtitle = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    aspectRatio: string
  ) => {
    const isVertical = aspectRatio === '9:16'
    const baseSize = isVertical ? canvas.height * 0.06 : canvas.height * 0.05
    const padding = canvas.height * 0.08
    
    const activeStyle = {
      ...settings.activeWord,
      fontSize: settings.activeWord.fontSize || baseSize
    }
    const nextStyle = {
      ...settings.nextLine,
      fontSize: settings.nextLine.fontSize || baseSize * 0.5
    }
    
    const positionY = getPositionY(canvas, settings.subtitlePosition, activeStyle.fontSize, padding)
    
    const { baseFontSize: activeFontSize } = applyStyle(ctx, activeStyle, canvas, true, activeWord.value)
    
    ctx.fillText(activeWord.value, canvas.width / 2, positionY)
    
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    if (settings.showNextLine && nextLine.value.length > 0) {
      const nextText = nextLine.value.join(' ')
      applyStyle(ctx, nextStyle, canvas, false, `Next: ${nextText}`)
      const nextY = positionY + activeFontSize * 1.5
      ctx.fillText(`Next: ${nextText}`, canvas.width / 2, nextY)
    }
  }
  
  const resetToDefaults = () => {
    settings.subtitlePosition = 'bottom'
    settings.activeWord = { ...defaultSubtitleStyle }
    settings.inactiveWord = { ...defaultInactiveStyle }
    settings.nextLine = { ...defaultNextLineStyle }
    settings.showNextLine = true
    settings.showSettings = false
  }
  
  return {
    scriptContent,
    speedMultiplier,
    isRecording,
    timer,
    words,
    lines,
    wordTimings,
    currentWordIndex,
    currentLineIndex,
    currentLine,
    nextLine,
    activeWord,
    activeLineWords,
    settings,
    WORDS_PER_LINE,
    drawSubtitle,
    resetToDefaults,
    defaultSubtitleStyle,
    defaultInactiveStyle,
    defaultNextLineStyle
  }
}
