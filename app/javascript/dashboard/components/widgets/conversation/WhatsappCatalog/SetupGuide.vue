<script setup>
import { computed } from 'vue';

import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  status: { type: String, default: 'error' },
  isAdmin: { type: Boolean, default: false },
  inboxId: { type: Number, default: undefined },
});

const emit = defineEmits(['close']);

const GUIDE_KEYS = {
  no_catalog: { key: 'NO_CATALOG', steps: ['ONE', 'TWO', 'THREE'] },
  missing_permission: {
    key: 'MISSING_PERMISSION',
    steps: ['ONE', 'TWO', 'THREE'],
  },
  error: { key: 'ERROR', steps: ['ONE', 'TWO'] },
};

const guide = computed(() => GUIDE_KEYS[props.status] || GUIDE_KEYS.error);
const prefix = computed(() => `CATALOG.SETUP_GUIDE.${guide.value.key}`);
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="catalog-setup-guide">
    <div class="flex flex-col gap-1">
      <h4 class="mb-0 text-base font-medium text-n-slate-12">
        {{ $t(`${prefix}.TITLE`) }}
      </h4>
      <p class="mb-0 text-sm text-n-slate-11">
        {{ $t(`${prefix}.DESCRIPTION`) }}
      </p>
    </div>
    <ol
      class="flex flex-col gap-2 mb-0 ms-5 text-sm list-decimal text-n-slate-12"
    >
      <li v-for="step in guide.steps" :key="step">
        {{ $t(`${prefix}.STEPS.${step}`) }}
      </li>
    </ol>
    <div class="flex flex-wrap items-center gap-3">
      <router-link
        v-if="isAdmin"
        :to="{ name: 'settings_inbox_show', params: { inboxId } }"
        data-testid="catalog-open-settings"
        @click="emit('close')"
      >
        <Button
          type="button"
          color="blue"
          :label="$t('CATALOG.SETUP_GUIDE.OPEN_SETTINGS')"
        />
      </router-link>
      <p v-else class="mb-0 text-sm text-n-slate-11">
        {{ $t('CATALOG.SETUP_GUIDE.ADMIN_ONLY') }}
      </p>
    </div>
  </div>
</template>
