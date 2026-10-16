<script setup>
import { useStore } from 'vuex';

import NextButton from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  conversationIds: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['done']);

const store = useStore();
const applyToSelection = async action => {
  await Promise.allSettled(
    props.conversationIds.map(id => store.dispatch(action, { id }))
  );
  emit('done');
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 min-w-0">
    <NextButton
      v-tooltip="$t('BULK_ACTION.MARK_READ')"
      :aria-label="$t('BULK_ACTION.MARK_READ')"
      :title="$t('BULK_ACTION.MARK_READ')"
      icon="i-lucide-mail-open"
      slate
      ghost
      xs
      @click="applyToSelection('markMessagesRead')"
    />
    <NextButton
      v-tooltip="$t('BULK_ACTION.MARK_UNREAD')"
      :aria-label="$t('BULK_ACTION.MARK_UNREAD')"
      :title="$t('BULK_ACTION.MARK_UNREAD')"
      icon="i-lucide-mail"
      slate
      ghost
      xs
      @click="applyToSelection('markMessagesUnread')"
    />
  </div>
</template>
