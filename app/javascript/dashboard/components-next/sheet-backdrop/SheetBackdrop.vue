<script setup>
// API (used by bottom sheets, menus and filters):
//   props: zIndexClass (Tailwind class, default 'z-[10000]'), blur (default true)
//   emits: close (first tap on the backdrop itself, not on slotted content)
//   slot:  optional. With a slot it wraps the sheet (children aligned to the
//          bottom with items-end). Without a slot it sits behind a sheet that
//          is positioned on its own.
// Touch moves over the backdrop are swallowed so the page behind never scrolls.
// Pair with useBodyScrollLock to lock the document while the sheet is open.
defineProps({
  zIndexClass: { type: String, default: 'z-[10000]' },
  blur: { type: Boolean, default: true },
});

const emit = defineEmits(['close']);

const onTap = () => emit('close');
</script>

<template>
  <div
    role="button"
    tabindex="-1"
    class="fixed inset-0 flex items-end overscroll-none cursor-pointer bg-n-alpha-black1"
    :class="[zIndexClass, { 'backdrop-blur-sm': blur }]"
    @click.self.stop.prevent="onTap"
    @touchmove.self.prevent
  >
    <slot />
  </div>
</template>
