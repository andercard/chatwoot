<script setup>
import SheetHandle from 'dashboard/components-next/sheet-handle/SheetHandle.vue';

defineProps({
  show: { type: Boolean, default: false },
  // On mobile the content opens in a bottom sheet; otherwise it renders in place.
  sheet: { type: Boolean, default: false },
  origin: {
    type: String,
    default: 'bottom',
    validator: value => ['top', 'bottom'].includes(value),
  },
});

const emit = defineEmits(['close']);
</script>

<template>
  <Teleport v-if="sheet" to="body">
    <div
      v-if="show"
      data-mobile-sheet
      class="fixed inset-0 z-[10000] flex items-end justify-center bg-n-alpha-black1 backdrop-blur-sm"
      @click.self.stop.prevent="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex flex-col w-full max-h-[90dvh] pt-8 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] border bg-n-solid-2 border-n-weak shadow-lg rounded-t-2xl"
      >
        <SheetHandle @close="emit('close')" />
        <slot />
      </div>
    </div>
  </Teleport>
  <Transition
    v-else
    :enter-active-class="`transition-all duration-150 ease-out ${origin === 'top' ? 'origin-top' : 'origin-bottom'}`"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    :leave-active-class="`transition-all duration-100 ease-in ${origin === 'top' ? 'origin-top' : 'origin-bottom'}`"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <slot v-if="show" />
  </Transition>
</template>
