<script setup>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';

import NextButton from 'dashboard/components-next/button/Button.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';

const props = defineProps({
  conversationIds: {
    type: Array,
    default: () => [],
  },
});

const BULK_READ_LIMIT = 100;
const BULK_READ_BATCH_SIZE = 10;

const store = useStore();
const { t } = useI18n();

const loadingAction = ref(null);

const applyToSelection = async action => {
  if (loadingAction.value) return;
  const ids = props.conversationIds;
  if (ids.length > BULK_READ_LIMIT) {
    useAlert(t('BULK_ACTION.READ_LIMIT_EXCEEDED', { limit: BULK_READ_LIMIT }));
    return;
  }

  loadingAction.value = action;
  let failedCount = 0;
  for (let i = 0; i < ids.length; i += BULK_READ_BATCH_SIZE) {
    const batch = ids.slice(i, i + BULK_READ_BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled(
      batch.map(id => store.dispatch(action, { id }))
    );
    failedCount += results.filter(r => r.status === 'rejected').length;
  }
  loadingAction.value = null;

  if (failedCount) {
    useAlert(t('BULK_ACTION.READ_PARTIAL_FAILURE', { count: failedCount }));
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="loadingAction"
      role="status"
      aria-live="polite"
      class="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3 bg-n-alpha-black2 backdrop-blur-sm"
    >
      <div
        class="flex items-center gap-3 px-5 py-3 border shadow-lg rounded-2xl bg-n-solid-2 border-n-weak text-n-slate-12"
      >
        <Spinner class="!w-5 !h-5" />
        {{ t('BULK_ACTION.UPDATING', { count: conversationIds.length }) }}
      </div>
    </div>
  </Teleport>
  <div class="flex flex-wrap items-center gap-2 min-w-0">
    <NextButton
      v-tooltip="$t('BULK_ACTION.MARK_READ')"
      :aria-label="$t('BULK_ACTION.MARK_READ')"
      :title="$t('BULK_ACTION.MARK_READ')"
      icon="i-lucide-mail-open"
      slate
      ghost
      xs
      :is-loading="loadingAction === 'markMessagesRead'"
      :disabled="!!loadingAction"
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
      :is-loading="loadingAction === 'markMessagesUnread'"
      :disabled="!!loadingAction"
      class="max-sm:!size-10 max-sm:[&>span]:!size-6"
      @click="applyToSelection('markMessagesUnread')"
    />
  </div>
</template>
