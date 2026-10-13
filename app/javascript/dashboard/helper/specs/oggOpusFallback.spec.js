import { needsOpusFallback, toPlayableUrl } from '../oggOpusFallback';

const decodeFile = vi.fn();
const free = vi.fn();
const decoderLoaded = vi.fn();

vi.mock('ogg-opus-decoder', () => {
  decoderLoaded();
  return {
    OggOpusDecoder: class {
      ready = Promise.resolve();

      decodeFile = decodeFile;

      free = free;
    },
  };
});

const mockCanPlay = value =>
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue(value);

describe('oggOpusFallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    decoderLoaded.mockClear();
    decodeFile.mockResolvedValue({
      channelData: [new Float32Array(48000).fill(0.5)],
      samplesDecoded: 48000,
      sampleRate: 48000,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    global.URL.createObjectURL = vi.fn(() => 'blob:wav');
  });

  describe('needsOpusFallback', () => {
    it('is true for ogg without opus support', () => {
      mockCanPlay('');
      expect(needsOpusFallback('audio/ogg')).toBe(true);
    });

    it('is false when the browser plays ogg/opus', () => {
      mockCanPlay('probably');
      expect(needsOpusFallback('audio/ogg')).toBe(false);
    });

    it('is false for other types', () => {
      mockCanPlay('');
      expect(needsOpusFallback('audio/mpeg')).toBe(false);
    });
  });

  describe('toPlayableUrl', () => {
    it('decodes and returns a 16 kHz mono WAV blob url', async () => {
      const url = await toPlayableUrl('https://example.com/a.ogg');
      expect(url).toBe('blob:wav');
      expect(decodeFile).toHaveBeenCalled();
      expect(free).toHaveBeenCalled();
      const blob = URL.createObjectURL.mock.calls[0][0];
      const reader = new FileReader();
      const read = new Promise(resolve => {
        reader.onload = () => resolve(reader.result);
      });
      reader.readAsArrayBuffer(blob);
      const bytes = new Uint8Array(await read);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF');
      expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(16000);
      expect(bytes.length).toBe(44 + 16000 * 2);
    });
  });

  it('does not load the decoder when the browser supports ogg', () => {
    mockCanPlay('probably');
    needsOpusFallback('audio/ogg');
    expect(decoderLoaded).not.toHaveBeenCalled();
  });
});
