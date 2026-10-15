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
  <div class="flex items-center gap-2">
    <NextButton
      :label="$t('BULK_ACTION.MARK_READ')"
      icon="i-lucide-mail-open"
      slate
      faded
      sm
      @click="applyToSelection('markMessagesRead')"
    />
    <NextButton
      :label="$t('BULK_ACTION.MARK_UNREAD')"
      icon="i-lucide-mail"
      slate
      faded
      sm
      @click="applyToSelection('markMessagesUnread')"
    />
  </div>
</template>
