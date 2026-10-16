<script setup>
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';

import NextButton from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  conversationIds: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['done']);

const BULK_READ_LIMIT = 100;
const BULK_READ_BATCH_SIZE = 10;

const store = useStore();
const { t } = useI18n();

const applyToSelection = async action => {
  const ids = props.conversationIds;
  if (ids.length > BULK_READ_LIMIT) {
    useAlert(t('BULK_ACTION.READ_LIMIT_EXCEEDED', { limit: BULK_READ_LIMIT }));
    return;
  }

  let failedCount = 0;
  for (let i = 0; i < ids.length; i += BULK_READ_BATCH_SIZE) {
    const batch = ids.slice(i, i + BULK_READ_BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(
      batch.map(id => store.dispatch(action, { id }))
    );
    failedCount += results.filter(r => r.status === 'rejected').length;
  }

  if (failedCount) {
    useAlert(t('BULK_ACTION.READ_PARTIAL_FAILURE', { count: failedCount }));
    return;
  }
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
      class="max-sm:!size-10 max-sm:[&>span]:!size-6"
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
      class="max-sm:!size-10 max-sm:[&>span]:!size-6"
      @click="applyToSelection('markMessagesUnread')"
    />
  </div>
</template>
