// Runs in the browser: turns a master into a short, low-quality public clip,
// so the full-quality file never has to be public. 60 seconds from about a
// third in (psytrance intros are long), mono 22.05 kHz with soft fades.

const RATE = 22050;
const FADE_IN = 1;
const FADE_OUT = 2.5;

export type Preview = { blob: Blob; duration: number };

export async function makePreview(file: File, seconds = 60): Promise<Preview> {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await file.arrayBuffer());
  } finally {
    void context.close();
  }
  const duration = decoded.duration;
  // Short tracks give at most half of themselves away.
  const length = Math.min(
    seconds,
    duration > seconds * 1.5 ? seconds : duration / 2,
  );
  const start =
    duration > length * 2 ? Math.min(duration * 0.33, duration - length) : 0;

  const offline = new OfflineAudioContext(1, Math.ceil(length * RATE), RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  const gain = offline.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(1, FADE_IN);
  gain.gain.setValueAtTime(1, Math.max(FADE_IN, length - FADE_OUT));
  gain.gain.linearRampToValueAtTime(0, length);
  source.connect(gain).connect(offline.destination);
  source.start(0, start, length);
  const rendered = await offline.startRendering();
  return { blob: encodeWav(rendered.getChannelData(0), RATE), duration };
}

/** 16-bit PCM WAV. */
function encodeWav(samples: Float32Array, rate: number) {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}

/** "03_Forest-Ritual (Original Mix).wav" → "Forest Ritual (Original Mix)". */
export function titleFromFileName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_]+/g, " ")
      .replace(/^\s*\d{1,3}\s*[-.)_ ]\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "Untitled"
  );
}
