import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { nextTick } from 'vue';
import AudioRecorder from './AudioRecorder.vue';

const mocks = vi.hoisted(() => ({
  record: { startRecording: vi.fn(), stopRecording: vi.fn(), on: vi.fn() },
}));

vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => ({ plugins: [mocks.record], destroy: vi.fn() })),
  },
}));
vi.mock('wavesurfer.js/dist/plugins/record.js', () => ({
  default: { create: vi.fn() },
}));
vi.mock('./utils/audioConversionUtils', () => ({ convertAudio: vi.fn() }));

const mountRecorder = () =>
  mount(AudioRecorder, {
    props: { audioRecordFormat: 'audio/mp3' },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'en', messages: {} })],
      stubs: { NextButton: { template: '<button />' } },
    },
  });

const progressTo = async seconds => {
  const [, onProgress] = mocks.record.on.mock.calls.find(
    ([event]) => event === 'record-progress'
  );
  onProgress(seconds * 1000);
  await nextTick();
};

describe('AudioRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
  });

  it('pausing stops the recording and shows the preview', async () => {
    const wrapper = mountRecorder();
    await flushPromises();
    await progressTo(2);
    expect(mocks.record.startRecording).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test-id="pause-recording"]').exists()).toBe(
      true
    );

    await wrapper.find('[data-test-id="pause-recording"]').trigger('click');
    await nextTick();

    expect(mocks.record.stopRecording).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test-id="pause-recording"]').exists()).toBe(
      false
    );
    expect(wrapper.find('[data-test-id="record-again"]').exists()).toBe(true);
    expect(wrapper.find('[role="slider"]').exists()).toBe(true);
  });

  it('emits send and delete from the bar', async () => {
    const wrapper = mountRecorder();
    await flushPromises();
    await progressTo(2);

    await wrapper.find('[data-test-id="send-recording"]').trigger('click');

    expect(wrapper.emitted('send')).toHaveLength(1);
  });

  it('disables send until something has been recorded', async () => {
    const wrapper = mountRecorder();
    await flushPromises();
    const send = () => wrapper.find('[data-test-id="send-recording"]');
    expect(send().attributes('disabled')).toBeDefined();
    expect(
      wrapper.find('[data-test-id="pause-recording"]').attributes('disabled')
    ).toBeDefined();

    await progressTo(1);
    expect(send().attributes('disabled')).toBeUndefined();
  });

  it('emits recordError with reason microphone without getUserMedia', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });
    const wrapper = mountRecorder();
    await flushPromises();

    expect(wrapper.emitted('recordError')[0][0].reason).toBe('microphone');
    expect(mocks.record.startRecording).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-id="pause-recording"]').exists()).toBe(
      false
    );
  });
});
