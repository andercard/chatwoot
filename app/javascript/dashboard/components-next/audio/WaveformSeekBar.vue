<script>
// 0.375rem: half of the 0.75rem (size-3) knob
const KNOB_RADIUS_PX = 6;

export const getKnobOffset = (progress, width, isRtl = false) => {
  const offset = progress * width - KNOB_RADIUS_PX;
  return isRtl ? -offset : offset;
};
</script>

<script setup>
import { computed, ref, useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';

const props = defineProps({
  progress: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  peaks: { type: Array, default: () => [] },
  label: { type: String, default: '' },
});

const emit = defineEmits(['seek']);

// 3px bar + 3px gap
const BAR_STEP_PX = 6;
const BAR_GAP_PX = 3;
const MIN_BARS = 16;
const MAX_BARS = 128;
// 1.25rem of the 2rem track when there are no peaks
const FLAT_BAR_HEIGHT = 0.625;
const KEYBOARD_STEP = 0.05;
const MIN_PEAK = 0.2;

const track = useTemplateRef('track');
const barsArea = useTemplateRef('barsArea');
const barCount = ref(MIN_BARS);
const isDragging = ref(false);
const areaWidth = ref(0);
const isRtl = ref(false);

const clamp = value => Math.min(1, Math.max(0, value));

useResizeObserver(barsArea, ([entry]) => {
  areaWidth.value = entry.contentRect.width;
  isRtl.value = getComputedStyle(entry.target).direction === 'rtl';
  const fit = Math.floor((entry.contentRect.width + BAR_GAP_PX) / BAR_STEP_PX);
  barCount.value = Math.min(MAX_BARS, Math.max(MIN_BARS, fit));
});

const bars = computed(() =>
  Array.from({ length: barCount.value }, (_, index) => {
    const peak = props.peaks.length
      ? props.peaks[Math.floor((index / barCount.value) * props.peaks.length)]
      : FLAT_BAR_HEIGHT;
    return { index, height: Math.max(MIN_PEAK, clamp(peak)) * 100 };
  })
);

const currentProgress = computed(() => clamp(props.progress));
const playedBars = computed(() =>
  Math.round(currentProgress.value * barCount.value)
);

const knobTransform = computed(() => {
  const x = getKnobOffset(currentProgress.value, areaWidth.value, isRtl.value);
  return `translate3d(${x}px, -50%, 0)`;
});

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
    class="flex items-center justify-center w-full min-w-0 h-8 px-1.5 cursor-pointer touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-n-brand rounded-md"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <div
      ref="barsArea"
      class="flex items-center justify-between w-full h-full relative"
    >
      <span
        v-for="bar in bars"
        :key="bar.index"
        v-memo="[bar.index < playedBars, bar.height]"
        class="w-[0.1875rem] shrink-0 rounded-full"
        :class="bar.index < playedBars ? 'bg-n-blue-9' : 'bg-n-slate-7'"
        :style="{ height: `${bar.height}%` }"
      />
      <div
        data-test-id="seek-knob"
        class="absolute top-1/2 start-0 size-3 will-change-transform pointer-events-none"
        :style="{ transform: knobTransform }"
      >
        <div
          class="size-full rounded-full bg-n-blue-9 shadow"
          :class="isDragging ? 'scale-125' : ''"
        />
      </div>
    </div>
  </div>
</template>
