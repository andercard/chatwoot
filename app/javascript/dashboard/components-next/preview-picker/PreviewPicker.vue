<script setup>
import { computed, nextTick, onMounted, useId, useTemplateRef } from 'vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  searchPlaceholder: {
    type: String,
    default: '',
  },
  emptyLabel: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  // Phone layout: no search field, no preview and one-line rows, driven by the host input
  compact: {
    type: Boolean,
    default: false,
  },
  // Phone layout only: fixed title above the list, with an optional edit link
  heading: {
    type: String,
    default: '',
  },
  editLabel: {
    type: String,
    default: '',
  },
  editTo: {
    type: [Object, String],
    default: null,
  },
  previewLayout: {
    type: String,
    default: 'side',
    validator: value => ['side', 'stacked', 'none'].includes(value),
  },
});

const emit = defineEmits(['select']);

const selectedIndex = defineModel('selectedIndex', {
  type: Number,
  default: 0,
});
const search = defineModel('search', { type: String, default: '' });

const listRef = useTemplateRef('listRef');
const searchRef = useTemplateRef('searchRef');

const listboxId = useId();
const optionId = index => `${listboxId}-${index}`;

const selectedItem = computed(() => props.items[selectedIndex.value]);

const isStacked = computed(() => props.previewLayout === 'stacked');

const hasPreview = computed(
  () =>
    !props.compact && props.previewLayout !== 'none' && props.items.length > 0
);

const listClass = computed(() => {
  if (!hasPreview.value) return 'w-full';
  return isStacked.value
    ? 'w-full flex-1'
    : 'w-2/5 flex-shrink-0 border-r rtl:border-r-0 rtl:border-l border-n-strong';
});

const previewClass = computed(() =>
  isStacked.value ? 'h-28 flex-shrink-0 border-t border-n-strong' : 'flex-1'
);

const groupFor = index => {
  const { group } = props.items[index];
  return group && group !== props.items[index - 1]?.group ? group : null;
};

// Scrolls the list itself. `scrollIntoView` would also scroll clipped ancestors, which
// shifts the card under a stationary cursor and leaves `mouseover` flickering between rows.
const scrollSelectedIntoView = () => {
  nextTick(() => {
    const list = listRef.value;
    const item = list?.querySelector(`[data-index="${selectedIndex.value}"]`);
    if (!item) return;

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  });
};

onMounted(() => {
  if (!props.compact) searchRef.value?.focus();
});

// Keeps the editor focused (and the on-screen keyboard open) when a row is tapped
const keepEditorFocus = event => {
  if (props.compact) event.preventDefault();
};

defineExpose({ scrollSelectedIntoView });
</script>

<template>
  <div
    class="flex overflow-hidden border shadow-lg rounded-xl border-n-strong bg-n-alpha-3 backdrop-blur-[100px]"
    :class="{ 'flex-col': isStacked }"
  >
    <div class="flex flex-col min-h-0" :class="listClass">
      <div
        v-if="!compact"
        class="relative flex items-center flex-shrink-0 h-11 px-3 border-b border-n-strong"
      >
        <Icon icon="i-lucide-search" class="size-4 text-n-slate-10" />
        <input
          ref="searchRef"
          v-model="search"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          :aria-controls="listboxId"
          :aria-activedescendant="items.length ? optionId(selectedIndex) : null"
          :aria-label="searchPlaceholder"
          class="w-full h-full px-2 text-sm bg-transparent outline-none text-n-slate-12 placeholder:text-n-slate-10 reset-base"
          :placeholder="searchPlaceholder"
        />
      </div>
      <div
        v-if="compact && heading"
        class="flex items-center justify-between flex-shrink-0 gap-2 px-3 py-2 border-b border-n-weak"
      >
        <span class="min-w-0 text-xs font-medium truncate text-n-slate-11">
          {{ heading }}
        </span>
        <router-link
          v-if="editTo && editLabel"
          :to="editTo"
          class="flex-shrink-0 text-xs font-medium text-n-brand"
        >
          {{ editLabel }}
        </router-link>
      </div>
      <div
        v-if="$slots.filters && !compact"
        class="flex-shrink-0 min-w-0 px-1 pt-1 pb-1.5"
        @mousedown.prevent
      >
        <slot name="filters" />
      </div>
      <div
        ref="listRef"
        class="flex-1 overflow-y-auto"
        :class="compact ? '' : 'p-1'"
        @mousedown="keepEditorFocus"
      >
        <ul :id="listboxId" role="listbox" class="m-0 list-none">
          <template v-for="(item, index) in items" :key="item.id">
            <li
              v-if="groupFor(index)"
              role="presentation"
              class="px-2 text-xs font-medium text-n-slate-10"
              :class="compact ? 'py-2' : ['pb-1', index === 0 ? '' : 'pt-2']"
            >
              {{ groupFor(index) }}
            </li>
            <li
              :id="optionId(index)"
              :data-index="index"
              role="option"
              :aria-selected="index === selectedIndex"
              class="flex items-center w-full gap-2 overflow-hidden cursor-pointer text-start"
              :class="[
                compact
                  ? 'px-3 py-2.5 border-b border-n-weak last:border-b-0'
                  : 'px-2 py-1 rounded-lg',
                index === selectedIndex ? 'bg-n-alpha-black2' : '',
              ]"
              @mousemove="selectedIndex = index"
              @click="emit('select', index)"
            >
              <slot
                name="leading"
                :item="item"
                :selected="index === selectedIndex"
              />
              <span
                class="flex flex-col min-w-0 gap-0.5"
                :class="{ 'flex-1': compact }"
              >
                <span
                  v-dompurify-html="item.title"
                  class="max-w-full min-w-0 font-medium truncate"
                  :class="
                    compact
                      ? 'text-xs text-n-slate-11'
                      : 'text-sm text-n-slate-12'
                  "
                />
                <span
                  v-if="item.subtitle"
                  v-dompurify-html="item.subtitle"
                  class="min-w-0 max-w-full truncate"
                  :class="
                    compact
                      ? 'text-sm text-n-slate-12'
                      : 'text-xs text-n-slate-11'
                  "
                />
              </span>
            </li>
          </template>
        </ul>
        <div
          v-if="!items.length"
          role="status"
          class="flex items-center px-2 py-1.5 text-sm text-n-slate-11"
        >
          <Spinner v-if="isLoading" :size="16" />
          <template v-else>{{ emptyLabel }}</template>
        </div>
      </div>
    </div>
    <div v-if="hasPreview" class="flex flex-col min-w-0" :class="previewClass">
      <div
        v-if="!isStacked"
        class="flex items-center flex-shrink-0 h-11 px-4 border-b border-n-strong"
      >
        <span class="min-w-0 text-xs font-medium truncate text-n-slate-11">
          {{ selectedItem?.label }}
        </span>
      </div>
      <div class="relative flex-1 min-h-0">
        <div class="absolute inset-0 overflow-y-auto">
          <slot name="preview" :item="selectedItem" />
        </div>
      </div>
    </div>
  </div>
</template>
