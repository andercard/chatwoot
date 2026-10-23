<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { frontendURL } from 'dashboard/helper/URLHelper';
import { useBodyScrollLock } from 'dashboard/composables/useBodyScrollLock';
import SheetBackdrop from 'dashboard/components-next/sheet-backdrop/SheetBackdrop.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import SheetHandle from 'dashboard/components-next/sheet-handle/SheetHandle.vue';
import Checkbox from 'dashboard/components-next/checkbox/Checkbox.vue';
import Label from 'dashboard/components-next/label/Label.vue';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  conversationId: { type: Number, required: true },
  conversationLabels: { type: Array, default: () => [] },
  assignLabels: { type: Function, required: true },
  removeLabels: { type: Function, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const { isAdmin } = useAdmin();
const router = useRouter();

useBodyScrollLock(true);

const normalize = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const accountLabels = useMapGetter('labels/getLabels');
const accountId = useMapGetter('getCurrentAccountId');
const searchQuery = ref('');
const filteredLabels = computed(() => {
  const query = normalize(searchQuery.value.trim());
  return accountLabels.value.filter(item =>
    normalize(item.title).includes(query)
  );
});
const selected = ref(new Set(props.conversationLabels));

const toggle = title => {
  if (selected.value.has(title)) selected.value.delete(title);
  else selected.value.add(title);
};

const onEditLabels = () => {
  emit('close');
  router.push(frontendURL(`accounts/${accountId.value}/settings/labels`));
};

const onSave = () => {
  const initial = new Set(props.conversationLabels);
  const toAdd = [...selected.value].filter(title => !initial.has(title));
  const toRemove = [...initial].filter(title => !selected.value.has(title));
  if (toAdd.length) props.assignLabels(toAdd, [props.conversationId]);
  if (toRemove.length) props.removeLabels(toRemove, [props.conversationId]);
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <SheetBackdrop data-mobile-sheet @close="emit('close')">
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex flex-col w-full max-h-[90dvh] pt-6 pb-4 border bg-n-solid-2 border-n-weak shadow-lg rounded-t-2xl"
      >
        <SheetHandle @close="emit('close')" />
        <div class="flex items-center justify-between gap-2 px-4 pb-2">
          <h3 class="text-sm font-medium text-n-slate-11">
            {{ t('CHAT_LIST.SWIPE.LABELS') }}
          </h3>
          <button
            v-if="isAdmin"
            type="button"
            class="text-sm font-medium text-n-brand"
            @click="onEditLabels"
          >
            {{ t('CHAT_LIST.SWIPE.EDIT_LABELS') }}
          </button>
        </div>
        <div class="px-4 pb-2">
          <Input
            v-model="searchQuery"
            type="search"
            size="sm"
            :placeholder="t('CHAT_LIST.SWIPE.SEARCH_LABELS')"
            custom-input-class="!ps-9"
          >
            <template #prefix>
              <span
                class="absolute i-lucide-search size-4 start-3 top-2 text-n-slate-10 pointer-events-none"
              />
            </template>
          </Input>
        </div>
        <div class="min-h-0 h-[50dvh] overflow-y-auto overscroll-contain">
          <label
            v-for="item in filteredLabels"
            :key="item.id"
            class="flex items-center w-full gap-3 px-4 py-3 cursor-pointer hover:bg-n-alpha-2"
          >
            <Checkbox
              :model-value="selected.has(item.title)"
              @change="toggle(item.title)"
            />
            <Label :label="item" compact />
          </label>
          <p
            v-if="!filteredLabels.length"
            class="px-4 py-3 text-sm text-n-slate-11"
          >
            {{ t('CHAT_LIST.SWIPE.NO_LABELS_FOUND') }}
          </p>
        </div>
        <div class="px-4 pt-2">
          <Button
            :label="t('CHAT_LIST.SWIPE.SAVE')"
            class="w-full"
            @click="onSave"
          />
        </div>
      </div>
    </SheetBackdrop>
  </Teleport>
</template>
