// For browsers that cannot play OGG/Opus in <audio> we decode the file with a
// WASM decoder (loaded lazily) and play a WAV instead.
const OPUS_SUPPORT_TYPE = 'audio/ogg; codecs=opus';
const TARGET_SAMPLE_RATE = 16000;

// Only when the browser reports no OGG/Opus support at all do we know upfront
// that playback is impossible. Anything else is tried natively first.
export const needsOpusFallback = type =>
  /ogg|opus/i.test(type || '') &&
  !document.createElement('audio').canPlayType(OPUS_SUPPORT_TYPE);

const toMono = (channelData, length) => {
  const mono = new Float32Array(length);
  channelData.forEach(channel => {
    for (let i = 0; i < length; i += 1)
      mono[i] += channel[i] / channelData.length;
  });
  return mono;
};

const resample = (samples, fromRate, toRate) => {
  if (fromRate === toRate) return samples;
  const outLength = Math.floor((samples.length * toRate) / fromRate);
  const out = new Float32Array(outLength);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outLength; i += 1) {
    const pos = i * ratio;
    const index = Math.floor(pos);
    const next = Math.min(index + 1, samples.length - 1);
    out[i] = samples[index] + (samples[next] - samples[index]) * (pos - index);
  }
  return out;
};

const writeString = (view, offset, text) => {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
};

const encodeWav = (samples, sampleRate) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      44 + i * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    );
  });
  return buffer;
};

export const toPlayableUrl = async url => {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Audio download failed: ${response.status}`);
  const file = new Uint8Array(await response.arrayBuffer());
  if (!file.length) throw new Error('Audio download returned an empty file');

  let decoderLoaded = false;
  try {
    const { OggOpusDecoder } = await import('ogg-opus-decoder');
    const decoder = new OggOpusDecoder();
    decoderLoaded = true;
    try {
      await decoder.ready;
      const { channelData, samplesDecoded, sampleRate } =
        await decoder.decodeFile(file);
      if (!samplesDecoded)
        throw new Error('Opus decoder returned no audio samples');
      const mono = toMono(channelData, samplesDecoded);
      const wav = encodeWav(
        resample(mono, sampleRate, TARGET_SAMPLE_RATE),
        TARGET_SAMPLE_RATE
      );
      return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    } finally {
      decoder.free();
    }
  } catch (error) {
    error.decoderLoaded = decoderLoaded;
    throw error;
  }
};
