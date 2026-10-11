<script setup>
import { useTemplateRef } from 'vue';
import { useSwipe } from '@vueuse/core';

const emit = defineEmits(['close']);

const handleRef = useTemplateRef('handleRef');

// Only the handle listens for the gesture, so scrolling the sheet content never closes it.
useSwipe(handleRef, {
  threshold: 40,
  onSwipeEnd: (_, direction) => {
    if (direction === 'down') emit('close');
  },
});
</script>

<template>
  <div
    ref="handleRef"
    class="absolute inset-x-0 top-0 z-10 flex items-center justify-center h-6 sm:hidden touch-none"
  >
    <span class="w-10 h-1 rounded-full bg-n-slate-8" />
  </div>
</template>
