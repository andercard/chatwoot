<script setup>
import { computed } from 'vue';
import { formatBytes } from 'shared/helpers/FileHelper';

import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  attachments: {
    type: Array,
    default: () => [],
  },
  showHdToggle: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['removeAttachment', 'toggleHd']);

const nonRecordedAudioAttachments = computed(() => {
  return props.attachments.filter(attachment => !attachment?.isVoiceMessage);
});

const recordedAudioAttachments = computed(() =>
  props.attachments.filter(attachment => attachment.isVoiceMessage)
);

const onRemoveAttachment = itemIndex => {
  emit(
    'removeAttachment',
    nonRecordedAudioAttachments.value
      .filter((_, index) => index !== itemIndex)
      .concat(recordedAudioAttachments.value)
  );
};

const formatFileSize = file => {
  const size = file.byte_size || file.size;
  return formatBytes(size, 0);
};

const isTypeImage = file => {
  const type = file.content_type || file.type;
  return type.includes('image');
};

const fileName = file => {
  return file.filename || file.name;
};
</script>

<template>
  <div class="flex gap-2 overflow-x-auto sm:hidden">
    <div
      v-for="(attachment, index) in nonRecordedAudioAttachments"
      :key="attachment.id"
      class="relative overflow-hidden size-24 shrink-0 rounded-xl bg-n-slate-3"
    >
      <img
        v-if="isTypeImage(attachment.resource)"
        class="object-cover size-full"
        :src="attachment.thumb"
      />
      <div
        v-else
        class="flex flex-col items-center justify-center gap-1 px-2 size-full"
      >
        <span class="i-lucide-file-text size-6 text-n-slate-11" />
        <span class="w-full text-xs text-center truncate">
          {{ fileName(attachment.resource) }}
        </span>
      </div>
      <button
        type="button"
        class="absolute flex items-center justify-center rounded-full !p-0 top-1 end-1 size-7 bg-n-solid-3 text-n-slate-12 shadow"
        :aria-label="fileName(attachment.resource)"
        @click="onRemoveAttachment(index)"
      >
        <span class="i-lucide-x size-4 shrink-0" />
      </button>
      <button
        v-if="showHdToggle && attachment.canToggleHd"
        type="button"
        class="absolute flex items-center gap-1 px-1.5 text-xs font-medium rounded-md bottom-1 start-1 h-5 disabled:opacity-70"
        :class="
          attachment.isHd
            ? 'bg-n-brand text-white'
            : 'bg-n-solid-3 text-n-slate-12'
        "
        :aria-pressed="!!attachment.isHd"
        :disabled="!!attachment.isOptimizing"
        @click="emit('toggleHd', attachment)"
      >
        <span
          v-if="attachment.isOptimizing"
          class="i-lucide-loader-circle size-3 animate-spin"
        />
        {{ $t('COMPONENTS.MEDIA.HD_BADGE') }}
      </button>
    </div>
  </div>
  <div
    class="flex flex-wrap gap-y-1 gap-x-2 overflow-auto max-h-[12.5rem] max-sm:hidden"
  >
    <div
      v-for="(attachment, index) in nonRecordedAudioAttachments"
      :key="attachment.id"
      class="flex items-center p-1 bg-n-slate-3 gap-1 rounded-md"
      :class="showHdToggle ? 'w-[18rem]' : 'w-[15rem]'"
    >
      <div class="max-w-[4rem] flex-shrink-0 w-6 flex items-center">
        <img
          v-if="isTypeImage(attachment.resource)"
          class="object-cover w-6 h-6 rounded-sm"
          :src="attachment.thumb"
        />
        <span v-else class="relative w-6 h-6 text-lg text-left -top-px">
          📄
        </span>
      </div>
      <div class="flex-1 min-w-0">
        <span class="block h-4 text-sm font-medium truncate">
          {{ fileName(attachment.resource) }}
        </span>
      </div>
      <div class="flex-shrink-0">
        <span class="text-xs whitespace-nowrap">
          {{ formatFileSize(attachment.resource) }}
        </span>
      </div>
      <div class="flex items-center justify-center flex-shrink-0 gap-1">
        <Button
          v-if="showHdToggle && attachment.canToggleHd"
          v-tooltip.top="$t('CONVERSATION.REPLYBOX.TIP_HD_ATTACHMENT')"
          xs
          :label="$t('COMPONENTS.MEDIA.HD_BADGE')"
          :variant="attachment.isHd ? 'solid' : 'ghost'"
          :color="attachment.isHd ? 'blue' : 'slate'"
          :aria-pressed="!!attachment.isHd"
          :is-loading="!!attachment.isOptimizing"
          :disabled="!!attachment.isOptimizing"
          @click="emit('toggleHd', attachment)"
        />
        <Button
          ghost
          slate
          xs
          icon="i-lucide-x"
          @click="onRemoveAttachment(index)"
        />
      </div>
    </div>
  </div>
</template>
