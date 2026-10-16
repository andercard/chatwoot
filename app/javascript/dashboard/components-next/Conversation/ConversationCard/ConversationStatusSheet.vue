<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getUnixTime } from 'date-fns';
import wootConstants from 'dashboard/constants/globals';
import { findSnoozeTime } from 'dashboard/helper/snoozeHelpers';
import SheetHandle from 'dashboard/components-next/sheet-handle/SheetHandle.vue';
import CustomSnoozeModal from 'dashboard/components/CustomSnoozeModal.vue';
import SheetBackdrop from 'dashboard/components-next/sheet-backdrop/SheetBackdrop.vue';
import { useBodyScrollLock } from 'dashboard/composables/useBodyScrollLock';

const props = defineProps({
  show: { type: Boolean, default: false },
  status: { type: String, default: '' },
});

const emit = defineEmits(['close', 'update']);

const { t } = useI18n();

const { STATUS_TYPE, SNOOZE_OPTIONS } = wootConstants;

const showSnoozeOptions = ref(false);
const showCustomSnooze = ref(false);

const isSheetOpen = computed(() => props.show && !showCustomSnooze.value);

useBodyScrollLock(isSheetOpen);

watch(
  () => props.show,
  () => {
    showSnoozeOptions.value = false;
    showCustomSnooze.value = false;
  }
);

const STATUS_ACTIONS = {
  [STATUS_TYPE.OPEN]: [
    {
      status: STATUS_TYPE.RESOLVED,
      label: 'CHAT_LIST.SWIPE.RESOLVE',
      icon: 'i-lucide-circle-check-big',
    },
    {
      status: STATUS_TYPE.PENDING,
      label: 'CHAT_LIST.SWIPE.PENDING',
      icon: 'i-lucide-clock',
    },
    {
      snooze: true,
      label: 'CHAT_LIST.SWIPE.SNOOZE',
      icon: 'i-lucide-alarm-clock',
    },
  ],
  [STATUS_TYPE.RESOLVED]: [
    {
      status: STATUS_TYPE.OPEN,
      label: 'CHAT_LIST.SWIPE.REOPEN',
      icon: 'i-lucide-rotate-ccw',
    },
  ],
  [STATUS_TYPE.PENDING]: [
    {
      status: STATUS_TYPE.OPEN,
      label: 'CHAT_LIST.SWIPE.REOPEN',
      icon: 'i-lucide-rotate-ccw',
    },
    {
      status: STATUS_TYPE.RESOLVED,
      label: 'CHAT_LIST.SWIPE.RESOLVE',
      icon: 'i-lucide-circle-check-big',
    },
  ],
  [STATUS_TYPE.SNOOZED]: [
    {
      status: STATUS_TYPE.OPEN,
      label: 'CHAT_LIST.SWIPE.REOPEN',
      icon: 'i-lucide-rotate-ccw',
    },
    {
      status: STATUS_TYPE.RESOLVED,
      label: 'CHAT_LIST.SWIPE.RESOLVE',
      icon: 'i-lucide-circle-check-big',
    },
  ],
};

const SNOOZE_ACTIONS = [
  {
    option: SNOOZE_OPTIONS.UNTIL_NEXT_REPLY,
    label: 'CHAT_LIST.SWIPE.SNOOZE_NEXT_REPLY',
  },
  {
    option: SNOOZE_OPTIONS.AN_HOUR_FROM_NOW,
    label: 'CHAT_LIST.SWIPE.SNOOZE_ONE_HOUR',
  },
  {
    option: SNOOZE_OPTIONS.UNTIL_TOMORROW,
    label: 'CHAT_LIST.SWIPE.SNOOZE_TOMORROW',
  },
  {
    option: SNOOZE_OPTIONS.UNTIL_NEXT_WEEK,
    label: 'CHAT_LIST.SWIPE.SNOOZE_NEXT_WEEK',
  },
  {
    option: SNOOZE_OPTIONS.UNTIL_CUSTOM_TIME,
    label: 'CHAT_LIST.SWIPE.SNOOZE_CUSTOM',
  },
];

const actions = computed(() => STATUS_ACTIONS[props.status] || []);

const onAction = action => {
  if (action.snooze) {
    showSnoozeOptions.value = true;
    return;
  }
  emit('update', action.status, null);
};

const onSnoozeOption = option => {
  if (option === SNOOZE_OPTIONS.UNTIL_CUSTOM_TIME) {
    showCustomSnooze.value = true;
    return;
  }
  emit('update', STATUS_TYPE.SNOOZED, findSnoozeTime(option));
};

const onChooseCustomTime = customTime => {
  showCustomSnooze.value = false;
  if (customTime) {
    emit('update', STATUS_TYPE.SNOOZED, getUnixTime(customTime));
  }
};

const ITEM_CLASSES =
  'flex items-center w-full gap-3 px-4 py-3 text-base text-start text-n-slate-12 hover:bg-n-alpha-2';
</script>

<template>
  <Teleport to="body">
    <SheetBackdrop v-if="isSheetOpen" @close="emit('close')">
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex flex-col w-full max-h-[90dvh] pt-6 pb-4 overflow-y-auto overscroll-contain border bg-n-solid-2 border-n-weak shadow-lg rounded-t-2xl"
      >
        <SheetHandle @close="emit('close')" />
        <h3 class="px-4 pb-2 text-sm font-medium text-n-slate-11">
          {{
            showSnoozeOptions
              ? t('CHAT_LIST.SWIPE.SNOOZE_TITLE')
              : t('CHAT_LIST.SWIPE.STATUS_TITLE')
          }}
        </h3>
        <template v-if="showSnoozeOptions">
          <button
            v-for="item in SNOOZE_ACTIONS"
            :key="item.option"
            type="button"
            :class="ITEM_CLASSES"
            @click="onSnoozeOption(item.option)"
          >
            {{ t(item.label) }}
          </button>
        </template>
        <template v-else>
          <button
            v-for="item in actions"
            :key="item.label"
            type="button"
            :class="ITEM_CLASSES"
            @click="onAction(item)"
          >
            <span class="size-5 text-n-slate-11" :class="item.icon" />
            {{ t(item.label) }}
          </button>
        </template>
      </div>
    </SheetBackdrop>
    <woot-modal
      v-model:show="showCustomSnooze"
      :on-close="() => (showCustomSnooze = false)"
    >
      <CustomSnoozeModal
        @close="showCustomSnooze = false"
        @choose-time="onChooseCustomTime"
      />
    </woot-modal>
  </Teleport>
</template>
