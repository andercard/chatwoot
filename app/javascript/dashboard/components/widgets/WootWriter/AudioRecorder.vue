<script setup>
import getUuid from 'widget/helpers/uuid';
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.js';
import { format, intervalToDuration } from 'date-fns';
import NextButton from 'dashboard/components-next/button/Button.vue';
import WaveformSeekBar from 'dashboard/components-next/audio/WaveformSeekBar.vue';
import { convertAudio } from './utils/audioConversionUtils';

const props = defineProps({
  audioRecordFormat: {
    type: String,
    required: true,
  },
  // 2rem tall live waveform
  height: {
    type: Number,
    default: 32,
  },
  isSending: {
    type: Boolean,
    default: false,
  },
  isNote: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'finishRecord',
  'recordError',
  'recordAgain',
  'delete',
  'send',
]);

const waveformContainer = ref(null);
const wavesurfer = ref(null);
const record = ref(null);
const isRecording = ref(false);
const durationText = ref('00:00');
const hasRecording = ref(false);
const recordedAudioUrl = ref(null);
const recordedDuration = ref(0);
const audio = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);

const formatTimeProgress = time => {
  const duration = intervalToDuration({ start: 0, end: time });
  return format(
    new Date(0, 0, 0, 0, duration.minutes, duration.seconds),
    'mm:ss'
  );
};

const AUDIO_EXTENSION_MAP = {
  'audio/ogg': 'ogg',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
};

const getRecordPluginOptions = audioFormat => {
  const options = {
    scrollingWaveform: true,
    renderRecordedAudio: false,
  };
  if (
    audioFormat === 'audio/ogg' &&
    MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
  ) {
    options.mimeType = 'audio/ogg;codecs=opus';
  }
  return options;
};

const initWaveSurfer = () => {
  wavesurfer.value = WaveSurfer.create({
    container: waveformContainer.value,
    waveColor: '#1F93FF',
    progressColor: '#6E6F73',
    height: props.height,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    plugins: [
      RecordPlugin.create(getRecordPluginOptions(props.audioRecordFormat)),
    ],
  });

  record.value = wavesurfer.value.plugins[0];

  record.value.on('record-end', async blob => {
    try {
      const audioBlob = await convertAudio(blob, props.audioRecordFormat);
      // Use the converted blob's actual type, which may differ from the
      // requested format when the browser can't produce it (e.g. Safari falls
      // back to MP3 instead of OGG). This keeps the filename, content type, and
      // voice-note flag consistent with the real bytes.
      const audioType = audioBlob.type || props.audioRecordFormat;
      const ext = AUDIO_EXTENSION_MAP[audioType] || 'mp3';
      const fileName = `${getUuid()}.${ext}`;
      const file = new File([audioBlob], fileName, {
        type: audioType,
      });
      if (recordedAudioUrl.value) URL.revokeObjectURL(recordedAudioUrl.value);
      recordedAudioUrl.value = URL.createObjectURL(audioBlob);
      audio.value = new Audio(recordedAudioUrl.value);
      audio.value.addEventListener('timeupdate', () => {
        currentTime.value = audio.value.currentTime;
      });
      audio.value.addEventListener('ended', () => {
        isPlaying.value = false;
      });
      emit('finishRecord', {
        name: file.name,
        type: file.type,
        size: file.size,
        file,
      });
      hasRecording.value = true;
    } catch (error) {
      hasRecording.value = false;
      emit('recordError', { error });
    }
  });

  record.value.on('record-progress', time => {
    recordedDuration.value = time / 1000;
    durationText.value = formatTimeProgress(time);
  });
};

const releaseAudio = () => {
  audio.value?.pause();
  audio.value = null;
  isPlaying.value = false;
  currentTime.value = 0;
  if (recordedAudioUrl.value) URL.revokeObjectURL(recordedAudioUrl.value);
  recordedAudioUrl.value = null;
};

const startRecording = () => {
  record.value.startRecording();
  isRecording.value = true;
};

// Pausing stops the recording: the preview plays the captured audio
const stopRecording = () => {
  if (!isRecording.value) return;
  record.value.stopRecording();
  isRecording.value = false;
};

const playPause = () => {
  if (!audio.value) return;
  if (isPlaying.value) {
    audio.value.pause();
  } else {
    audio.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

const seek = progress => {
  if (!audio.value) return;
  audio.value.currentTime = progress * recordedDuration.value;
  currentTime.value = audio.value.currentTime;
};

const recordAgain = async () => {
  releaseAudio();
  hasRecording.value = false;
  recordedDuration.value = 0;
  durationText.value = '00:00';
  emit('recordAgain');
  await nextTick();
  startRecording();
};

const progress = computed(() =>
  recordedDuration.value ? currentTime.value / recordedDuration.value : 0
);

const timeText = computed(() => {
  if (isRecording.value) return durationText.value;
  const elapsed = formatTimeProgress(currentTime.value * 1000);
  return isPlaying.value || currentTime.value > 0
    ? elapsed
    : durationText.value;
});

onMounted(() => {
  initWaveSurfer();
  startRecording();
});

onUnmounted(() => {
  releaseAudio();
  if (wavesurfer.value) {
    wavesurfer.value.destroy();
  }
});

defineExpose({ stopRecording, record });
</script>

<template>
  <div class="flex gap-2 items-center w-full min-w-0">
    <NextButton
      icon="i-lucide-trash-2"
      ruby
      faded
      sm
      class="flex-shrink-0 !rounded-full"
      :aria-label="$t('CONVERSATION.REPLYBOX.AUDIO.DELETE')"
      @click="emit('delete')"
    />
    <div class="flex flex-1 gap-2 items-center min-w-0">
      <template v-if="isRecording">
        <span
          class="flex-shrink-0 rounded-full animate-pulse size-2.5 bg-n-ruby-9"
        />
      </template>
      <NextButton
        v-else
        :icon="isPlaying ? 'i-ph-pause-fill' : 'i-ph-play-fill'"
        slate
        faded
        sm
        class="flex-shrink-0 !rounded-full"
        :disabled="!hasRecording"
        :aria-label="
          isPlaying
            ? $t('CONVERSATION.REPLYBOX.AUDIO.PAUSE_PLAYBACK')
            : $t('CONVERSATION.REPLYBOX.AUDIO.PLAY')
        "
        @click="playPause"
      />
      <div
        v-show="isRecording"
        ref="waveformContainer"
        class="flex-1 min-w-0 overflow-hidden"
      />
      <div v-if="!isRecording" class="flex-1 min-w-0 overflow-hidden">
        <WaveformSeekBar
          :progress="progress"
          :duration="recordedDuration"
          :label="$t('CONVERSATION.REPLYBOX.AUDIO.SEEK')"
          @seek="seek"
        />
      </div>
      <span
        class="shrink-0 min-w-[2.75rem] text-sm font-medium text-end text-n-slate-12 tabular-nums"
        data-test-id="recording-duration"
      >
        {{ timeText }}
      </span>
    </div>
    <NextButton
      v-if="isRecording"
      icon="i-ph-pause-fill"
      ruby
      sm
      class="flex-shrink-0 !rounded-full"
      :aria-label="$t('CONVERSATION.REPLYBOX.AUDIO.PAUSE')"
      data-test-id="pause-recording"
      @click="stopRecording"
    />
    <NextButton
      v-else
      icon="i-ph-microphone-fill"
      ruby
      sm
      class="flex-shrink-0 !rounded-full"
      :aria-label="$t('CONVERSATION.REPLYBOX.AUDIO.RECORD_AGAIN')"
      data-test-id="record-again"
      @click="recordAgain"
    />
    <NextButton
      icon="i-lucide-arrow-up"
      sm
      class="flex-shrink-0 !rounded-full"
      :color="isNote ? 'amber' : 'blue'"
      :disabled="isSending"
      :aria-label="$t('CONVERSATION.REPLYBOX.AUDIO.SEND')"
      data-test-id="send-recording"
      @click="emit('send')"
    />
  </div>
</template>
