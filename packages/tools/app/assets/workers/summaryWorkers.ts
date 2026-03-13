import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

let summarizer: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, text, model } = e.data;

  if (type === 'init') {
    try {
      if (!summarizer) {
        summarizer = await pipeline('summarization', model || 'Xenova/distilbart-cnn-12-6', {
          progress_callback: (progress: any) => {
            self.postMessage({ type: 'progress', progress: progress.progress });
          },
        });
        self.postMessage({ type: 'ready' });
      } else {
        self.postMessage({ type: 'ready' });
      }
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  } else if (type === 'summarize') {
    if (!summarizer) {
      self.postMessage({ type: 'error', error: 'Summarizer not initialized' });
      return;
    }

    try {
      const result = await summarizer(text, {
        max_length: 130,
        min_length: 30,
        do_sample: false,
      });

      self.postMessage({ type: 'complete', summary: result[0].summary_text });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }
};
