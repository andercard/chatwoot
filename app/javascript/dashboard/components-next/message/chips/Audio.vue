<script setup>
import {
  computed,
  onMounted,
  useTemplateRef,
  ref,
  getCurrentInstance,
  onBeforeUnmount,
  nextTick,
} from 'vue';
import Icon from 'next/icon/Icon.vue';
import WaveformSeekBar from 'next/audio/WaveformSeekBar.vue';
import { timeStampAppendedURL } from 'dashboard/helper/URLHelper';
import { downloadFile } from '@chatwoot/utils';
import { useEmitter } from 'dashboard/composables/emitter';
import { emitter } from 'shared/helpers/mitt';
import {
  needsOpusFallback,
  toPlayableUrl,
} from 'dashboard/helper/oggOpusFallback';

const { attachment } = defineProps({
  attachment: {
    type: Object,
    required: true,
  },
  showTranscribedText: {
    type: Boolean,
    default: true,
  },
});

defineOptions({
  inheritAttrs: false,
});

const timeStampURL = computed(() => {
  return timeStampAppendedURL(attachment.dataUrl);
});

// Native <audio> first. We only convert OGG/Opus to WAV when the browser can't
// play it (known upfront) or when the native playback actually fails.
const fallbackUrl = ref(null);
const isConverting = ref(false);
const conversionFailed = ref(false);
const playableUrl = computed(() => fallbackUrl.value || timeStampURL.value);
const isOgg = attachment.extension?.toLowerCase() === 'ogg';
const convertsUpfront = isOgg && needsOpusFallback('audio/ogg');
const isPlayDisabled = computed(() => isConverting.value);

const TRANSCRIPT_PREVIEW_LENGTH = 200;
const isTranscriptExpanded = ref(false);
const isTranscriptLong = computed(
  () => (attachment.transcribedText?.length || 0) > TRANSCRIPT_PREVIEW_LENGTH
);
const displayedTranscript = computed(() => {
  const text = attachment.transcribedText || '';
  if (!isTranscriptLong.value || isTranscriptExpanded.value) return text;
  return `${text.slice(0, TRANSCRIPT_PREVIEW_LENGTH).trimEnd()}…`;
});

const audioPlayer = useTemplateRef('audioPlayer');

const isPlaying = ref(false);
const isMuted = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const playbackSpeed = ref(1);

const { uid } = getCurrentInstance();

// `timeupdate` only fires ~4 times per second, which makes the knob jump.
// While playing we read the real currentTime on every frame instead.
// The browser also only updates `currentTime` in coarse steps, so between real
// updates we interpolate from the last known media time and the wall clock.
const SEEK_BACK_THRESHOLD = 0.25;
const MIN_READY_STATE = 3;
let rafId = null;
let lastMediaTime = 0;
let lastStamp = 0;
let lastRealTime = 0;
const syncClock = () => {
  const real = audioPlayer.value?.currentTime ?? 0;
  lastRealTime = real;
  lastMediaTime = real;
  lastStamp = performance.now();
  return real;
};
const stopTracking = () => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  if (audioPlayer.value) currentTime.value = syncClock();
};
const tick = () => {
  const el = audioPlayer.value;
  rafId = requestAnimationFrame(tick);
  if (!el) return;
  const now = performance.now();
  const real = el.currentTime;
  const canExtrapolate =
    !el.paused && !el.ended && !el.seeking && el.readyState >= MIN_READY_STATE;

  if (!canExtrapolate) {
    syncClock();
    currentTime.value = real;
    return;
  }

  if (real !== lastRealTime) {
    const isSeekBack = real < currentTime.value - SEEK_BACK_THRESHOLD;
    lastRealTime = real;
    lastMediaTime = real;
    lastStamp = now;
    currentTime.value = isSeekBack ? real : Math.max(real, currentTime.value);
    return;
  }

  const estimate = lastMediaTime + ((now - lastStamp) / 1000) * el.playbackRate;
  const max = Number.isFinite(duration.value) ? duration.value : estimate;
  currentTime.value = Math.max(currentTime.value, Math.min(estimate, max));
};
const startTracking = () => {
  if (rafId === null) rafId = requestAnimationFrame(tick);
};

// MediaRecorder-produced WebM/Opus blobs lack a Duration header → <audio>.duration
// resolves to Infinity until we seek past the end, which forces the engine to
// scan the file and compute the real length. Safe no-op for files with a real
// duration already (mp3/m4a/etc).
const resolveStreamingDuration = () => {
  const el = audioPlayer.value;
  if (!el) return;
  const onTimeUpdate = () => {
    el.removeEventListener('timeupdate', onTimeUpdate);
    el.currentTime = 0;
    duration.value = el.duration;
  };
  el.addEventListener('timeupdate', onTimeUpdate);
  try {
    el.currentTime = Number.MAX_SAFE_INTEGER;
  } catch {
    el.removeEventListener('timeupdate', onTimeUpdate);
  }
};

const onLoadedMetadata = () => {
  const d = audioPlayer.value?.duration;
  if (!Number.isFinite(d)) {
    resolveStreamingDuration();
    return;
  }
  duration.value = d;
};

const playbackSpeedLabel = computed(() => {
  return `${playbackSpeed.value}x`;
});

// There maybe a chance that the audioPlayer ref is not available
// When the onLoadMetadata is called, so we need to set the duration
// value when the component is mounted
onMounted(() => {
  const d = audioPlayer.value?.duration;
  if (Number.isFinite(d)) duration.value = d;
  audioPlayer.value.playbackRate = playbackSpeed.value;
});

// Listen for global audio play events and pause if it's not this audio
useEmitter('pause_playing_audio', currentPlayingId => {
  if (currentPlayingId !== uid && isPlaying.value) {
    try {
      audioPlayer.value.pause();
    } catch {
      /* ignore pause errors */
    }
    isPlaying.value = false;
    stopTracking();
  }
});

const formatTime = time => {
  if (!time || Number.isNaN(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const toggleMute = () => {
  audioPlayer.value.muted = !audioPlayer.value.muted;
  isMuted.value = audioPlayer.value.muted;
};

const onTimeUpdate = () => {
  if (rafId !== null) return;
  currentTime.value = audioPlayer.value?.currentTime;
};

const progress = computed(() =>
  duration.value ? currentTime.value / duration.value : 0
);

const seek = ratio => {
  const time = ratio * duration.value;
  audioPlayer.value.currentTime = time;
  currentTime.value = time;
  lastRealTime = time;
  lastMediaTime = time;
  lastStamp = performance.now();
};

const convertToPlayable = async () => {
  if (isConverting.value || fallbackUrl.value) return;
  isConverting.value = true;
  conversionFailed.value = false;
  try {
    fallbackUrl.value = await toPlayableUrl(attachment.dataUrl);
    await nextTick();
    audioPlayer.value.load();
    audioPlayer.value.playbackRate = playbackSpeed.value;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('OGG/Opus fallback failed', {
      name: error.name,
      message: error.message,
      decoderLoaded: error.decoderLoaded,
    });
    conversionFailed.value = true;
  } finally {
    isConverting.value = false;
  }
};

// The native <audio> failed: fall back to the WAV (or give up if it was the WAV).
const onMediaError = () => {
  stopTracking();
  isPlaying.value = false;
  if (!isOgg) return;
  if (fallbackUrl.value) {
    conversionFailed.value = true;
    return;
  }
  convertToPlayable();
};

// Convert before the tap: iOS only allows play() inside the user gesture.
let visibilityObserver = null;
const stopObserving = () => {
  visibilityObserver?.disconnect();
  visibilityObserver = null;
};

onMounted(() => {
  if (!convertsUpfront) return;
  if (typeof IntersectionObserver === 'undefined') {
    convertToPlayable();
    return;
  }
  visibilityObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    stopObserving();
    convertToPlayable();
  });
  visibilityObserver.observe(
    audioPlayer.value.parentElement ?? audioPlayer.value
  );
});

onBeforeUnmount(() => {
  stopTracking();
  stopObserving();
  if (fallbackUrl.value) URL.revokeObjectURL(fallbackUrl.value);
});

const playOrPause = () => {
  if (isPlayDisabled.value) return;
  if (isPlaying.value) {
    audioPlayer.value.pause();
    isPlaying.value = false;
    stopTracking();
    return;
  }
  // Emit event to pause all other audio
  emitter.emit('pause_playing_audio', uid);
  isPlaying.value = true;
  startTracking();
  audioPlayer.value.play().catch(error => {
    isPlaying.value = false;
    stopTracking();
    if (error.name === 'AbortError') return;
    // eslint-disable-next-line no-console
    console.error('Audio playback failed', error.name, error.message);
    onMediaError();
  });
};

const onEnd = () => {
  stopTracking();
  isPlaying.value = false;
  currentTime.value = 0;
  playbackSpeed.value = 1;
  audioPlayer.value.playbackRate = 1;
};

const changePlaybackSpeed = () => {
  const speeds = [1, 1.5, 2];
  const currentIndex = speeds.indexOf(playbackSpeed.value);
  const nextIndex = (currentIndex + 1) % speeds.length;
  playbackSpeed.value = speeds[nextIndex];
  audioPlayer.value.playbackRate = playbackSpeed.value;
  syncClock();
};

const downloadAudio = async () => {
  const { fileType, dataUrl, extension } = attachment;
  downloadFile({ url: dataUrl, type: fileType, extension });
};
</script>

<template>
  <audio
    ref="audioPlayer"
    controls
    class="hidden"
    playsinline
    @loadedmetadata="onLoadedMetadata"
    @timeupdate="onTimeUpdate"
    @ended="onEnd"
    @error="onMediaError"
  >
    <source :src="playableUrl" @error="onMediaError" />
  </audio>
  <div
    v-bind="$attrs"
    class="rounded-xl w-full gap-2 p-1.5 bg-n-alpha-white flex flex-col items-center border border-n-container shadow-[0px_2px_8px_0px_rgba(94,94,94,0.06)]"
  >
    <div class="flex gap-2 w-full flex-1 items-center justify-start">
      <button
        class="p-0 border-0 size-10 shrink-0 grid place-content-center rounded-full bg-n-blue-9 text-white"
        :disabled="isPlayDisabled"
        @click="playOrPause"
      >
        <Icon
          v-if="isConverting"
          class="size-5 animate-spin"
          icon="i-lucide-loader-circle"
        />
        <Icon
          v-else
          class="size-6"
          :icon="
            isPlaying
              ? 'i-teenyicons-pause-small-solid'
              : 'i-teenyicons-play-small-solid'
          "
        />
      </button>
      <div class="flex flex-col flex-1 min-w-0">
        <div class="w-56 max-w-full">
          <WaveformSeekBar
            :progress="progress"
            :duration="duration"
            :label="$t('CONVERSATION.REPLYBOX.AUDIO.SEEK')"
            @seek="seek"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="tabular-nums text-xs text-n-slate-11">
            {{ formatTime(isPlaying || currentTime ? currentTime : duration) }}
          </span>
          <div class="flex items-center">
            <button
              class="p-0 border-0 size-5 grid place-content-center text-n-slate-11"
              @click="toggleMute"
            >
              <Icon
                v-if="isMuted"
                class="size-3.5"
                icon="i-lucide-volume-off"
              />
              <Icon v-else class="size-3.5" icon="i-lucide-volume-2" />
            </button>
            <button
              class="p-0 border-0 size-5 grid place-content-center text-n-slate-11"
              @click="downloadAudio"
            >
              <Icon class="size-3.5" icon="i-lucide-download" />
            </button>
          </div>
        </div>
      </div>
      <button
        class="border-0 h-6 px-2 shrink-0 grid place-content-center bg-n-alpha-2 hover:bg-n-alpha-3 rounded-2xl"
        @click="changePlaybackSpeed"
      >
        <span class="text-xs text-n-slate-11 font-medium tabular-nums">
          {{ playbackSpeedLabel }}
        </span>
      </button>
    </div>

    <p v-if="conversionFailed" class="m-0 w-full text-xs text-n-amber-11">
      {{ $t('CONVERSATION.AUDIO.PLAYBACK_FAILED') }}
    </p>

    <div
      v-if="attachment.transcribedText && showTranscribedText"
      class="text-n-slate-12 p-3 text-sm bg-n-alpha-1 rounded-lg w-full break-words"
    >
      {{ displayedTranscript }}
      <button
        v-if="isTranscriptLong"
        class="block mt-1 p-0 border-0 bg-transparent text-n-slate-11 hover:text-n-slate-12 font-medium"
        @click="isTranscriptExpanded = !isTranscriptExpanded"
      >
        {{
          isTranscriptExpanded
            ? $t('CONVERSATION.VOICE_CALL.TRANSCRIPT_SHOW_LESS')
            : $t('CONVERSATION.VOICE_CALL.TRANSCRIPT_SHOW_MORE')
        }}
      </button>
    </div>
  </div>
</template>
