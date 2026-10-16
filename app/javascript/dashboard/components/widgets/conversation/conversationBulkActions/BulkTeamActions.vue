<script setup>
import { useTemplateRef, computed, ref } from 'vue';
import { useI18n, I18nT } from 'vue-i18n';
import { useToggle, useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import { vOnClickOutside } from '@vueuse/components';
import { useMapGetter } from 'dashboard/composables/store';

import Button from 'dashboard/components-next/button/Button.vue';
import BulkActionSheet from './BulkActionSheet.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';

const props = defineProps({
  conversationCount: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['select']);

const { t } = useI18n();
const containerRef = useTemplateRef('containerRef');
const [showDropdown, toggleDropdown] = useToggle(false);
const isMobile = useBreakpoints(breakpointsTailwind).smaller('sm');
const selectedTeam = ref(null);

const teams = useMapGetter('teams/getTeams');
const bulkActionsUiFlags = useMapGetter('bulkActions/getUIFlags');
const isUpdating = computed(() => bulkActionsUiFlags.value.isUpdating);

const teamMenuItems = computed(() => {
  const items = [
    {
      action: 'select',
      value: 'none',
      label: t('BULK_ACTION.TEAMS.NONE'),
      isSelected: selectedTeam.value?.id === 0,
    },
  ];

  teams.value.forEach(team => {
    items.push({
      action: 'select',
      value: team.id,
      label: team.name,
      isSelected: selectedTeam.value?.id === team.id,
    });
  });

  return items;
});

const handleSelectTeam = item => {
  if (item.value === 'none') {
    selectedTeam.value = { id: 0, name: t('BULK_ACTION.TEAMS.NONE') };
  } else {
    const foundTeam = teams.value.find(team => team.id === item.value);
    selectedTeam.value = foundTeam || {
      id: 0,
      name: t('BULK_ACTION.TEAMS.NONE'),
    };
  }
};

const handleAssign = () => {
  if (isUpdating.value) return;
  emit('select', selectedTeam.value);
  selectedTeam.value = null;
  toggleDropdown(false);
};

const handleCancel = () => {
  selectedTeam.value = null;
};

const handleDismiss = () => {
  selectedTeam.value = null;
  toggleDropdown(false);
};
</script>

<template>
  <div ref="containerRef" class="relative">
    <Button
      v-tooltip="$t('BULK_ACTION.ASSIGN_TEAM_TOOLTIP')"
      icon="i-lucide-users-round"
      slate
      xs
      ghost
      class="max-sm:!size-10 max-sm:[&>span]:!size-6"
      :class="{ 'bg-n-alpha-2': showDropdown }"
      @click="toggleDropdown()"
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
        :menu-items="teamMenuItems"
        show-search
        :search-placeholder="t('BULK_ACTION.SEARCH_INPUT_PLACEHOLDER')"
        :class="
          isMobile
            ? '!static !w-full max-h-[70dvh]'
            : 'ltr:-right-2 rtl:-left-2 bottom-8 w-60 max-h-80'
        "
        @action="handleSelectTeam"
      >
        <template v-if="selectedTeam" #footer>
          <div
            class="pt-2 pb-2 px-2 border-t border-n-weak sticky bottom-0 rounded-b-md z-20 bg-n-alpha-3 backdrop-blur-[4px]"
          >
            <div class="flex flex-col gap-2">
              <I18nT
                v-if="selectedTeam.id"
                keypath="BULK_ACTION.TEAMS.ASSIGN_TEAM_CONFIRMATION_LABEL"
                tag="p"
                class="text-xs text-n-slate-11 px-1 mb-0"
                :plural="props.conversationCount"
              >
                <template #n>
                  <strong class="text-n-slate-12">
                    {{ props.conversationCount }}
                  </strong>
                </template>
                <template #teamName>
                  <strong class="text-n-slate-12">
                    {{ selectedTeam.name }}
                  </strong>
                </template>
              </I18nT>
              <I18nT
                v-else
                keypath="BULK_ACTION.TEAMS.UNASSIGN_TEAM_CONFIRMATION_LABEL"
                tag="p"
                class="text-xs text-n-slate-11 px-1 mb-0"
                :plural="props.conversationCount"
              >
                <template #n>
                  <strong class="text-n-slate-12">
                    {{ props.conversationCount }}
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
                  :disabled="isUpdating"
                  :is-loading="isUpdating"
                  @click="handleAssign"
                />
              </div>
            </div>
          </div>
        </template>
      </DropdownMenu>
    </BulkActionSheet>
  </div>
</template>
