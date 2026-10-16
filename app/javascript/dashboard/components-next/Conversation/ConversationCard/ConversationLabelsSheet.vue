<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
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

const accountLabels = useMapGetter('labels/getLabels');
const selected = ref(new Set(props.conversationLabels));

const toggle = title => {
  if (selected.value.has(title)) selected.value.delete(title);
  else selected.value.add(title);
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
    <div
      data-mobile-sheet
      class="fixed inset-0 z-[10000] flex items-end justify-center bg-n-alpha-black1 backdrop-blur-sm"
      @click.self.stop.prevent="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        class="relative flex flex-col w-full max-h-[90dvh] pt-6 pb-4 overflow-y-auto border bg-n-solid-2 border-n-weak shadow-lg rounded-t-2xl"
      >
        <SheetHandle @close="emit('close')" />
        <h3 class="px-4 pb-2 text-sm font-medium text-n-slate-11">
          {{ t('CHAT_LIST.SWIPE.LABELS') }}
        </h3>
        <label
          v-for="item in accountLabels"
          :key="item.id"
          class="flex items-center w-full gap-3 px-4 py-3 cursor-pointer hover:bg-n-alpha-2"
        >
          <Checkbox
            :model-value="selected.has(item.title)"
            @change="toggle(item.title)"
          />
          <Label :label="item" compact />
        </label>
        <div class="px-4 pt-2">
          <Button
            :label="t('CHAT_LIST.SWIPE.SAVE')"
            class="w-full"
            @click="onSave"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
