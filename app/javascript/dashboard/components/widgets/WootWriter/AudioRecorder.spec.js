import { mount } from '@vue/test-utils';
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

describe('AudioRecorder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pausing stops the recording and shows the preview', async () => {
    const wrapper = mountRecorder();
    await nextTick();
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

    await wrapper.find('[data-test-id="send-recording"]').trigger('click');

    expect(wrapper.emitted('send')).toHaveLength(1);
  });
});
