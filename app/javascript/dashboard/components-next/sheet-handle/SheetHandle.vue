<script setup>
import { computed, useTemplateRef } from 'vue';
import { useSwipe } from '@vueuse/core';

const props = defineProps({
  // Breakpoint from which the sheet turns into a popover and the handle disappears.
  hideFrom: {
    type: String,
    default: 'sm',
    validator: value => ['sm', 'lg'].includes(value),
  },
});

const emit = defineEmits(['close']);

// The sheet closes once it is dragged past this share of its own height (or this distance, if larger).
const CLOSE_DISTANCE_RATIO = 0.3;
const MIN_CLOSE_DISTANCE_PX = 64;
const SLIDE_DURATION_MS = 200;
const OFFSET_VAR = '--sheet-offset';
// Tailwind classes toggled on the sheet; only the drag distance itself is dynamic, so it travels as a CSS variable.
const DRAG_CLASS = 'translate-y-[var(--sheet-offset)]';
const ANIMATE_CLASSES = ['transition-transform', 'duration-200', 'ease-out'];

const HIDE_FROM_CLASSES = { sm: 'sm:hidden', lg: 'lg:hidden' };
const hideClass = computed(() => HIDE_FROM_CLASSES[props.hideFrom]);

const handleRef = useTemplateRef('handleRef');

// The handle is the first child of the sheet, so the sheet is its parent.
const getSheet = () => handleRef.value?.parentElement;

const close = () => emit('close');

const moveSheet = (distance, animated) => {
  const sheet = getSheet();
  if (!sheet) return;
  sheet.classList.add(DRAG_CLASS);
  sheet.classList.toggle(ANIMATE_CLASSES[0], animated);
  sheet.classList.toggle(ANIMATE_CLASSES[1], animated);
  sheet.classList.toggle(ANIMATE_CLASSES[2], animated);
  sheet.style.setProperty(OFFSET_VAR, `${distance}px`);
};

const resetSheet = sheet => {
  sheet.classList.remove(DRAG_CLASS, ...ANIMATE_CLASSES);
  sheet.style.removeProperty(OFFSET_VAR);
};

// Tapping the handle (no drag) closes the sheet as well.
const closeBySlidingDown = () => {
  const sheet = getSheet();
  if (!sheet) {
    close();
    return;
  }
  moveSheet(sheet.offsetHeight, true);
  setTimeout(() => {
    close();
    resetSheet(sheet);
  }, SLIDE_DURATION_MS);
};

// Only the handle listens for the gesture, so scrolling the sheet content never closes it.
const { lengthY } = useSwipe(handleRef, {
  threshold: 10,
  // lengthY is negative while swiping down: the sheet follows the finger
  onSwipe: () => moveSheet(Math.max(0, -lengthY.value), false),
  onSwipeEnd: () => {
    const sheet = getSheet();
    if (!sheet) return;
    const distance = Math.max(0, -lengthY.value);
    const closeDistance = Math.max(
      MIN_CLOSE_DISTANCE_PX,
      sheet.offsetHeight * CLOSE_DISTANCE_RATIO
    );
    if (distance >= closeDistance) {
      closeBySlidingDown();
      return;
    }
    // Not far enough: snap back
    moveSheet(0, true);
    setTimeout(() => resetSheet(sheet), SLIDE_DURATION_MS);
  },
});
</script>

<template>
  <div
    ref="handleRef"
    class="absolute inset-x-0 top-0 z-10 flex items-center justify-center h-6 touch-none"
    :class="hideClass"
    @click="closeBySlidingDown"
  >
    <span class="w-10 h-1 rounded-full bg-n-slate-8" />
  </div>
</template>
