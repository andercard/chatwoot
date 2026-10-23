<script setup>
import { useTemplateRef, computed, ref } from 'vue';
import { useI18n, I18nT } from 'vue-i18n';
import { useToggle, useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import { vOnClickOutside } from '@vueuse/components';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useOrderedMacros } from 'dashboard/composables/useOrderedMacros';

import Button from 'dashboard/components-next/button/Button.vue';
import BulkActionSheet from './BulkActionSheet.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';

const props = defineProps({
  conversationCount: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['execute']);

const { t } = useI18n();
const store = useStore();

const containerRef = useTemplateRef('containerRef');
const [showDropdown, toggleDropdown] = useToggle(false);
const isMobile = useBreakpoints(breakpointsTailwind).smaller('sm');
const selectedMacro = ref(null);

const { orderedMacros } = useOrderedMacros();
const macrosUiFlags = useMapGetter('macros/getUIFlags');

const isExecuting = computed(() => macrosUiFlags.value.isExecuting);
const isLoading = computed(
  () => macrosUiFlags.value.isFetching && !orderedMacros.value.length
);

const macroMenuItems = computed(() =>
  orderedMacros.value.map(macro => ({
    action: 'select',
    value: macro.id,
    label: macro.name,
    isSelected: selectedMacro.value?.id === macro.id,
  }))
);

const handleToggleDropdown = () => {
  if (!showDropdown.value) store.dispatch('macros/get');
  toggleDropdown();
};

const handleSelectMacro = item => {
  selectedMacro.value = orderedMacros.value.find(
    macro => macro.id === item.value
  );
};

const handleExecute = () => {
  if (isExecuting.value) return;
  emit('execute', selectedMacro.value);
  selectedMacro.value = null;
  toggleDropdown(false);
};

const handleCancel = () => {
  selectedMacro.value = null;
};

const handleDismiss = () => {
  selectedMacro.value = null;
  toggleDropdown(false);
};
</script>

<template>
  <div ref="containerRef" class="relative">
    <Button
      v-tooltip="$t('BULK_ACTION.MACROS.EXECUTE_MACRO')"
      icon="i-lucide-toy-brick"
      slate
      xs
      ghost
      class="max-sm:!size-10 max-sm:[&>span]:!size-6"
      :class="{ 'bg-n-alpha-2': showDropdown }"
      @click="handleToggleDropdown"
    />
    <BulkActionSheet
      :show="showDropdown"
      :sheet="isMobile"
      @close="handleDismiss"
    >
      <DropdownMenu
        v-on-click-outside="[
          () => !isMobile && handleDismiss(),
          { ignore: [containerRef] },
        ]"
        :menu-items="macroMenuItems"
        :is-loading="isLoading"
        show-search
        :search-placeholder="t('BULK_ACTION.SEARCH_INPUT_PLACEHOLDER')"
        empty-state-message="MACROS.LIST.404"
        :class="
          isMobile
            ? '!static !w-full max-h-[70dvh]'
            : 'end-2 bottom-8 w-60 max-h-80'
        "
        @action="handleSelectMacro"
      >
        <template v-if="selectedMacro" #footer>
          <div
            class="pt-2 pb-2 px-2 border-t border-n-weak sticky bottom-0 rounded-b-md z-20 bg-n-alpha-3 backdrop-blur-[4px]"
          >
            <div class="flex flex-col gap-2">
              <I18nT
                keypath="BULK_ACTION.MACROS.EXECUTE_CONFIRMATION_LABEL"
                tag="p"
                class="text-xs text-n-slate-11 px-1 mb-0"
                :plural="props.conversationCount"
              >
                <template #n>
                  <strong class="text-n-slate-12">
                    {{ props.conversationCount }}
                  </strong>
                </template>
                <template #macroName>
                  <strong class="text-n-slate-12">
                    {{ selectedMacro.name }}
                  </strong>
                </template>
              </I18nT>
              <div class="flex gap-2">
                <Button
                  sm
                  faded
                  slate
                  class="flex-1"
                  :label="t('BULK_ACTION.CANCEL')"
                  @click="handleCancel"
                />
                <Button
                  sm
                  class="flex-1"
                  :label="t('BULK_ACTION.YES')"
                  :disabled="isExecuting"
                  :is-loading="isExecuting"
                  @click="handleExecute"
                />
              </div>
            </div>
          </div>
        </template>
      </DropdownMenu>
    </BulkActionSheet>
  </div>
</template>
