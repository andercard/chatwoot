/* global VideoEncoder */
const MAX_ENCODE_QUEUE = 8;

// The Conversion API always asks for H.264 High, so the encoder is wrapped to force Baseline or Main.
export const createAvcProfileEncoder = (lib, getCodecString) =>
  class AvcProfileEncoder extends lib.CustomVideoEncoder {
    static supports(codec, config) {
      return codec === 'avc' && !!config.codec?.startsWith('avc1.');
    }

    async init() {
      this.encoder = new VideoEncoder({
        output: (chunk, meta) =>
          this.onPacket(lib.EncodedPacket.fromEncodedChunk(chunk), meta),
        error: error => this.onError(error),
      });
      this.encoder.configure({
        ...this.config,
        codec: getCodecString(),
        avc: { format: 'avc' },
      });
    }

    async encode(sample, options) {
      if (this.encoder.encodeQueueSize > MAX_ENCODE_QUEUE) {
        await new Promise(resolve => {
          this.encoder.addEventListener('dequeue', resolve, { once: true });
        });
      }
      const frame = sample.toVideoFrame();
      try {
        this.encoder.encode(frame, options);
      } finally {
        frame.close();
      }
    }

    async flush() {
      await this.encoder.flush();
    }

    async close() {
      if (this.encoder.state !== 'closed') this.encoder.close();
    }
  };
