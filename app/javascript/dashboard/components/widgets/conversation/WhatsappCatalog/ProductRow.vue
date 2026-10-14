<script setup>
defineProps({
  product: { type: Object, required: true },
  checked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  multiple: { type: Boolean, default: true },
});

defineEmits(['toggle']);
</script>

<template>
  <label
    class="flex items-center gap-3 p-2 rounded-lg outline outline-1 -outline-offset-1"
    :class="[
      checked ? 'outline-n-brand bg-n-alpha-2' : 'outline-n-container',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    ]"
  >
    <input
      :type="multiple ? 'checkbox' : 'radio'"
      class="mb-0 shrink-0"
      :checked="checked"
      :disabled="disabled"
      @change="$emit('toggle', product)"
    />
    <img
      v-if="product.image_urls?.length"
      :src="product.image_urls[0]"
      :alt="$t('CATALOG.PRODUCT.PHOTO_OF', { name: product.name })"
      class="object-cover rounded-md size-12 shrink-0"
    />
    <div v-else class="rounded-md size-12 shrink-0 bg-n-alpha-2" />
    <div class="flex flex-col min-w-0">
      <span class="text-sm font-medium truncate text-n-slate-12">
        {{ product.name }}
      </span>
      <span v-if="product.price" class="text-xs text-n-slate-11">
        {{ product.price }}
      </span>
    </div>
  </label>
</template>
