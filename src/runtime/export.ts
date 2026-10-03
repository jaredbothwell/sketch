import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { Engine } from './types';

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const canvasToPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));

export const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/**
 * Deterministic MP4 export: steps the engine frame by frame and encodes with WebCodecs,
 * so the result is smooth no matter how slow the sketch renders.
 */
export async function recordMp4(engine: Engine, seconds: number, fps: number, onProgress?: (f: number) => void) {
  const c = engine.canvas;
  const width = c.width - (c.width % 2);
  const height = c.height - (c.height % 2);
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width, height }, fastStart: 'in-memory' });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => console.error(e),
  });
  encoder.configure({ codec: 'avc1.640034', width, height, bitrate: 25e6, framerate: fps });

  const total = Math.round(seconds * fps);
  engine.pause();
  try {
    for (let i = 0; i < total; i++) {
      engine.renderFrame(i / fps);
      const frame = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i % fps === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 1));
      onProgress?.((i + 1) / total);
    }
    await encoder.flush();
    muxer.finalize();
  } finally {
    engine.play();
  }
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
