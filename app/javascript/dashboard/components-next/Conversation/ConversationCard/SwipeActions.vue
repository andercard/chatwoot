<script setup>
import { computed, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  useSwipeGesture,
  OPEN_RATIO,
} from 'dashboard/composables/useSwipeGesture';

const props = defineProps({
  hasUnread: { type: Boolean, default: false },
  showAssignMe: { type: Boolean, default: true },
});

const emit = defineEmits([
  'markUnread',
  'markRead',
  'assignMe',
  'openStatus',
  'openLabels',
]);

const { t } = useI18n();

const startActionsRef = useTemplateRef('startActionsRef');
const endActionsRef = useTemplateRef('endActionsRef');

const getStartWidth = () => startActionsRef.value?.offsetWidth ?? 0;
const getEndWidth = () => endActionsRef.value?.offsetWidth ?? 0;

const onRelease = ({ offsetX }) => {
  if (offsetX > getStartWidth() * OPEN_RATIO) return getStartWidth();
  if (offsetX < -getEndWidth() * OPEN_RATIO) return -getEndWidth();
  return 0;
};

const { offsetX, isSwiping, close, handlers } = useSwipeGesture({
  maxRight: getStartWidth,
  maxLeft: getEndWidth,
  onRelease,
});

const cardStyle = computed(() => ({
  transform: `translateX(${offsetX.value}px)`,
}));

const onToggleRead = () => {
  if (props.hasUnread) emit('markRead');
  else emit('markUnread');
  close();
};

const onAssignMe = () => {
  emit('assignMe');
  close();
};

const onOpenStatus = () => {
  emit('openStatus');
  close();
};

const onOpenLabels = () => {
  emit('openLabels');
  close();
};

const ACTION_CLASSES =
  '!rounded-none flex flex-col items-center justify-center w-20 h-full gap-1 text-xs font-medium text-white';
</script>

<template>
  <div class="relative overflow-hidden">
    <div class="absolute inset-y-0 flex" :class="{ invisible: offsetX === 0 }">
      <div ref="startActionsRef" class="flex h-full">
        <button
          type="button"
          class="bg-n-blue-9"
          :class="ACTION_CLASSES"
          tabindex="-1"
          @click="onToggleRead"
        >
          <span
            :class="
              hasUnread ? 'i-lucide-mail-open size-5' : 'i-lucide-mail size-5'
            "
          />
          {{
            hasUnread
              ? t('CHAT_LIST.SWIPE.MARK_READ')
              : t('CHAT_LIST.SWIPE.MARK_UNREAD')
          }}
        </button>
        <button
          v-if="showAssignMe"
          type="button"
          class="bg-n-teal-9"
          :class="ACTION_CLASSES"
          tabindex="-1"
          @click="onAssignMe"
        >
          <span class="i-lucide-user-plus size-5" />
          {{ t('CHAT_LIST.SWIPE.ASSIGN_ME') }}
        </button>
      </div>
    </div>
    <div
      class="absolute inset-y-0 end-0 flex"
      :class="{ invisible: offsetX === 0 }"
    >
      <div ref="endActionsRef" class="flex h-full">
        <button
          type="button"
          class="bg-n-slate-9"
          :class="ACTION_CLASSES"
          tabindex="-1"
          @click="onOpenStatus"
        >
          <span class="i-lucide-circle-check-big size-5" />
          {{ t('CHAT_LIST.SWIPE.STATUS') }}
        </button>
        <button
          type="button"
          class="bg-n-teal-9"
          :class="ACTION_CLASSES"
          tabindex="-1"
          @click="onOpenLabels"
        >
          <span class="i-lucide-tag size-5" />
          {{ t('CHAT_LIST.SWIPE.LABELS') }}
        </button>
      </div>
    </div>
    <div
      class="relative touch-pan-y bg-n-background"
      :class="{ 'transition-transform duration-200': !isSwiping }"
      :style="cardStyle"
      v-bind="handlers"
    >
      <slot />
    </div>
  </div>
</template>
