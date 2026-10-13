<script setup>
import { computed, ref, useTemplateRef } from 'vue';

const props = defineProps({
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  peaks: { type: Array, default: () => [] },
  label: { type: String, default: '' },
});

const emit = defineEmits(['seek']);

const BAR_COUNT = 32;
// 1.25rem of the 2rem track when there are no peaks
const FLAT_BAR_HEIGHT = 0.625;
const KEYBOARD_STEP = 0.05;
const MIN_PEAK = 0.2;

const track = useTemplateRef('track');
const isDragging = ref(false);

const clamp = value => Math.min(1, Math.max(0, value));

const bars = computed(() =>
  Array.from({ length: BAR_COUNT }, (_, index) => {
    const peak = props.peaks.length
      ? props.peaks[Math.floor((index / BAR_COUNT) * props.peaks.length)]
      : FLAT_BAR_HEIGHT;
    return { index, height: Math.max(MIN_PEAK, clamp(peak)) * 100 };
  })
);

const currentProgress = computed(() => clamp(props.progress));
const playedBars = computed(() =>
  Math.round(currentProgress.value * BAR_COUNT)
);

const emitFromPointer = event => {
  const rect = track.value.getBoundingClientRect();
  if (!rect.width) return;
  emit('seek', clamp((event.clientX - rect.left) / rect.width));
};

const onPointerDown = event => {
  isDragging.value = true;
  track.value.setPointerCapture?.(event.pointerId);
  emitFromPointer(event);
};

const onPointerMove = event => {
  if (isDragging.value) emitFromPointer(event);
};

const onPointerUp = event => {
  if (!isDragging.value) return;
  emitFromPointer(event);
  isDragging.value = false;
  track.value.releasePointerCapture?.(event.pointerId);
};

const onKeydown = event => {
  const steps = {
    ArrowLeft: -KEYBOARD_STEP,
    ArrowDown: -KEYBOARD_STEP,
    ArrowRight: KEYBOARD_STEP,
    ArrowUp: KEYBOARD_STEP,
  };
  if (event.key === 'Home') emit('seek', 0);
  else if (event.key === 'End') emit('seek', 1);
  else if (event.key in steps) {
    emit('seek', clamp(currentProgress.value + steps[event.key]));
  } else return;
  event.preventDefault();
};
</script>

<template>
  <div
    ref="track"
    role="slider"
    tabindex="0"
    :aria-label="label || undefined"
    aria-valuemin="0"
    :aria-valuemax="Math.round(duration)"
    :aria-valuenow="Math.round(currentProgress * duration)"
    class="flex items-center justify-between gap-0.5 w-full min-w-0 h-8 relative cursor-pointer touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-n-brand rounded-md"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <span
      v-for="bar in bars"
      :key="bar.index"
      class="w-[0.1875rem] shrink-0 rounded-full"
      :class="bar.index < playedBars ? 'bg-n-blue-9' : 'bg-n-slate-7'"
      :style="{ height: `${bar.height}%` }"
    />
    <div
      data-test-id="seek-knob"
      class="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-n-blue-9 shadow pointer-events-none"
      :class="isDragging ? 'scale-125' : ''"
      :style="{
        insetInlineStart: `calc(${currentProgress * 100}% - 0.375rem)`,
      }"
    />
  </div>
</template>
