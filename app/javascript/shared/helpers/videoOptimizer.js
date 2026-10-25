/* global VideoEncoder, AudioEncoder, AudioData */
import { createAvcProfileEncoder } from 'shared/helpers/avcProfileEncoder';

export const VIDEO_OPTIMIZATION_ERRORS = {
  UNSUPPORTED: 'UNSUPPORTED',
  DECODE_FAILED: 'DECODE_FAILED',
  TOO_LARGE: 'TOO_LARGE',
  CANCELED: 'CANCELED',
};

export class VideoOptimizationError extends Error {
  constructor(code, message = code, options = undefined) {
    super(message, options);
    this.name = 'VideoOptimizationError';
    this.code = code;
  }
}

// Baseline never uses B-frames, which Android WhatsApp clients can't play. Main is the fallback.
const AVC_CODEC_CANDIDATES = ['avc1.42e02a', 'avc1.4d002a'];
const AAC_CODEC = 'mp4a.40.2';
const SAMPLE_CONFIG = { width: 1280, height: 720, bitrate: 2000000 };
const SIZE_MARGIN = 0.95;
const MIN_VIDEO_BITRATE = 250000;
const AVC_PROFILES = {
  66: 'baseline',
  77: 'main',
  88: 'extended',
  100: 'high',
};

let supportCheck = null;
let avcCodecString = null;
let mediabunny = null;

export const isVideoOptimizationSupported = () =>
  typeof VideoEncoder !== 'undefined' &&
  typeof AudioEncoder !== 'undefined' &&
  typeof VideoFrame !== 'undefined';

const findSupportedAvcCodec = async () => {
  for (let i = 0; i < AVC_CODEC_CANDIDATES.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { supported } = await VideoEncoder.isConfigSupported({
      codec: AVC_CODEC_CANDIDATES[i],
      ...SAMPLE_CONFIG,
      framerate: 30,
      avc: { format: 'avc' },
    });
    if (supported) return AVC_CODEC_CANDIDATES[i];
  }
  return null;
};

// isConfigSupported can report AAC as available while the encoder fails on real samples, so encode a few.
const aacEncodeWorks = async config => {
  let chunks = 0;
  const encoder = new AudioEncoder({
    output: () => {
      chunks += 1;
    },
    error: () => {},
  });
  try {
    encoder.configure(config);
    const frames = config.sampleRate;
    const audio = new AudioData({
      format: 'f32-planar',
      sampleRate: config.sampleRate,
      numberOfFrames: frames,
      numberOfChannels: config.numberOfChannels,
      timestamp: 0,
      data: new Float32Array(frames * config.numberOfChannels),
    });
    encoder.encode(audio);
    audio.close();
    await encoder.flush();
    return chunks > 0;
  } catch (error) {
    return false;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
};

const checkSupport = async () => {
  if (!isVideoOptimizationSupported() || typeof AudioData === 'undefined') {
    return false;
  }
  try {
    avcCodecString = await findSupportedAvcCodec();
    if (!avcCodecString) return false;
    const audioConfig = {
      codec: AAC_CODEC,
      sampleRate: 48000,
      numberOfChannels: 2,
      bitrate: 96000,
    };
    const { supported } = await AudioEncoder.isConfigSupported(audioConfig);
    return !!supported && (await aacEncodeWorks(audioConfig));
  } catch (error) {
    return false;
  }
};

export const canEncodeVideoAudio = () => {
  supportCheck = supportCheck || checkSupport();
  return supportCheck;
};

const loadMediabunny = async () => {
  if (!mediabunny) {
    const lib = await import('mediabunny');
    lib.registerEncoder(createAvcProfileEncoder(lib, () => avcCodecString));
    mediabunny = lib;
  }
  return mediabunny;
};

const openInput = (lib, file) =>
  new lib.Input({
    formats: lib.ALL_FORMATS,
    source: new lib.BlobSource(file),
  });

const parseAvcProfile = codecString => {
  const match = /^avc[13]\.([0-9a-f]{2})/i.exec(codecString || '');
  if (!match) return null;
  return AVC_PROFILES[parseInt(match[1], 16)] || 'other';
};

export const probeVideo = async file => {
  const lib = await loadMediabunny();
  const input = openInput(lib, file);
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED);
    }
    const audioTrack = await input.getPrimaryAudioTrack();
    const [width, height, codecString, duration, channels] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      videoTrack.getCodecParameterString(),
      input
        .getDurationFromMetadata()
        .then(value => value ?? input.computeDuration()),
      audioTrack ? audioTrack.getNumberOfChannels() : 0,
    ]);
    const videoCodec = videoTrack.codec;
    return {
      durationSeconds: duration,
      width,
      height,
      longestSide: Math.max(width, height),
      videoCodec,
      avcProfile: videoCodec === 'avc' ? parseAvcProfile(codecString) : null,
      audioCodec: audioTrack ? audioTrack.codec : null,
      audioChannels: channels,
      hasAudio: !!audioTrack,
    };
  } catch (error) {
    if (error instanceof VideoOptimizationError) throw error;
    throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED);
  } finally {
    input.dispose();
  }
};

const toEven = value => Math.max(2, Math.round(value / 2) * 2);

const getTargetSize = (probe, maxSide) => {
  const scale = Math.min(1, maxSide / probe.longestSide);
  return {
    width: toEven(probe.width * scale),
    height: toEven(probe.height * scale),
  };
};

const getVideoBitrate = (probe, step, maxBytes) => {
  const budgetBits = maxBytes * 8 * SIZE_MARGIN;
  const audioBits = probe.hasAudio
    ? step.audioBitrate * probe.durationSeconds
    : 0;
  const fitBitrate = Math.floor(
    (budgetBits - audioBits) / probe.durationSeconds
  );
  return Math.min(step.maxVideoBitrate, fitBitrate);
};

const runStep = async (
  lib,
  file,
  probe,
  step,
  maxBytes,
  signal,
  onProgress
) => {
  const videoBitrate = getVideoBitrate(probe, step, maxBytes);
  if (videoBitrate < MIN_VIDEO_BITRATE) return null;

  const target = new lib.BufferTarget();
  const output = new lib.Output({
    format: new lib.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  });
  const input = openInput(lib, file);
  const { width, height } = getTargetSize(probe, step.maxSide);
  try {
    const conversion = await lib.Conversion.init({
      input,
      output,
      showWarnings: false,
      video: {
        codec: 'avc',
        width,
        height,
        fit: 'fill',
        forceTranscode: true,
        quality: new lib.Quality({ bitrate: videoBitrate }),
      },
      audio: {
        codec: 'aac',
        forceTranscode: true,
        numberOfChannels: Math.min(2, probe.audioChannels || 2),
        quality: new lib.Quality({ bitrate: step.audioBitrate }),
      },
    });
    const droppedAudio =
      probe.hasAudio &&
      conversion.discardedTracks.some(({ track }) => track.type === 'audio');
    if (!conversion.isValid || droppedAudio) {
      throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED);
    }
    conversion.onProgress = progress => onProgress?.(progress);
    const cancel = () => conversion.cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      await conversion.execute();
    } finally {
      signal?.removeEventListener('abort', cancel);
    }
    return { buffer: target.buffer, width, height };
  } finally {
    input.dispose();
  }
};

export const optimizeVideo = async (
  file,
  { maxBytes, ladder, onProgress, signal }
) => {
  if (!(await canEncodeVideoAudio())) {
    throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.UNSUPPORTED);
  }
  const lib = await loadMediabunny();
  const probe = await probeVideo(file);
  if (!probe.durationSeconds) {
    throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED);
  }

  // Steps run sequentially on purpose: the first one that fits wins.
  for (let i = 0; i < ladder.length; i += 1) {
    if (signal?.aborted) {
      throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.CANCELED);
    }
    let result;
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await runStep(
        lib,
        file,
        probe,
        ladder[i],
        maxBytes,
        signal,
        onProgress
      );
    } catch (error) {
      if (signal?.aborted) {
        throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.CANCELED);
      }
      if (error instanceof VideoOptimizationError) throw error;
      throw new VideoOptimizationError(
        VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED,
        undefined,
        { cause: error }
      );
    }
    if (result?.buffer && result.buffer.byteLength <= maxBytes) {
      const baseName = file.name.replace(/\.[^./\\]+$/, '');
      return {
        file: new File([result.buffer], `${baseName}.mp4`, {
          type: 'video/mp4',
          lastModified: Date.now(),
        }),
        width: result.width,
        height: result.height,
      };
    }
  }
  throw new VideoOptimizationError(VIDEO_OPTIMIZATION_ERRORS.TOO_LARGE);
};
