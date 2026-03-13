import { Input, ALL_FORMATS, BlobSource } from 'mediabunny';

export const extractAudio = async (file: File): Promise<{ buffer: Float32Array; duration: number }> => {
  // Use mediabunny to get metadata
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  
  let duration = 0;
  try {
    duration = await input.computeDuration();
  } catch (e) {
    console.warn('Mediabunny could not compute duration, falling back to AudioContext duration');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        resolve({ buffer: channelData, duration: duration || audioBuffer.duration });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
