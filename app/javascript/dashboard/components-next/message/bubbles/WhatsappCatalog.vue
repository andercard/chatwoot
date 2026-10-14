<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseBubble from './Base.vue';
import WhatsappCatalogDetail from './WhatsappCatalogDetail.vue';
import { useMessageContext } from '../provider.js';

const { content, contentAttributes } = useMessageContext();
const { t } = useI18n();

const detailItem = ref(null);
const listOpen = ref(false);

const catalog = computed(() => contentAttributes.value?.whatsappCatalog ?? {});
const items = computed(() => catalog.value.items ?? []);
const isCarousel = computed(() => catalog.value.kind === 'carousel');
const isList = computed(() => catalog.value.kind === 'product_list');
const firstItem = computed(() => items.value[0]);
const collectionName = computed(
  () =>
    firstItem.value?.section ||
    catalog.value.header ||
    t('CATALOG.NO_COLLECTION')
);
const firstImage = item => item?.imageUrls?.[0];
</script>

<template>
  <BaseBubble
    class="p-3 min-w-0 max-w-full"
    :class="isCarousel ? 'sm:max-w-xl' : 'sm:max-w-xs'"
    data-bubble-name="whatsapp-catalog"
  >
    <div class="flex flex-col gap-2 min-w-0">
      <div v-if="catalog.header && !isList" class="font-medium break-words">
        {{ catalog.header }}
      </div>
      <button
        v-if="isList"
        type="button"
        class="flex items-center gap-3 p-2 text-start border rounded-lg border-n-weak"
        data-test-id="catalog-list-header"
        @click="listOpen = true"
      >
        <img
          v-if="firstImage(firstItem)"
          :src="firstImage(firstItem)"
          :alt="collectionName"
          loading="lazy"
          class="object-cover rounded-md size-12"
        />
        <span v-else class="rounded-md size-12 bg-n-alpha-2" />
        <span class="flex flex-col min-w-0">
          <span class="font-medium truncate">{{ collectionName }}</span>
          <span class="text-xs text-n-slate-11">
            {{ t('CATALOG.PRODUCT.ITEMS_COUNT', { count: items.length }) }}
          </span>
        </span>
      </button>
      <div v-if="content" class="whitespace-pre-wrap break-words">
        {{ content }}
      </div>

      <div
        v-if="!isList"
        class="flex gap-2 max-w-full pb-1 overflow-x-auto snap-x snap-mandatory"
        data-test-id="catalog-cards"
      >
        <div
          v-for="item in items"
          :key="item.retailerId"
          class="flex flex-col shrink-0 snap-start overflow-hidden border rounded-lg w-60 border-n-weak bg-n-solid-2"
          data-test-id="catalog-card"
        >
          <button
            type="button"
            class="block w-full aspect-square bg-n-alpha-2"
            @click="detailItem = item"
          >
            <img
              v-if="firstImage(item)"
              :src="firstImage(item)"
              :alt="item.name"
              loading="lazy"
              class="object-cover w-full aspect-square"
            />
          </button>
          <div class="flex flex-col gap-0.5 p-2 min-w-0">
            <span class="text-sm font-semibold truncate">{{ item.name }}</span>
            <span v-if="item.price" class="text-sm text-n-slate-11">
              {{ item.price }}
            </span>
          </div>
          <button
            type="button"
            class="py-2 text-sm font-medium text-center border-t text-n-brand border-n-weak hover:bg-n-alpha-2"
            @click="detailItem = item"
          >
            {{ t('CATALOG.PRODUCT.VIEW') }}
          </button>
        </div>
      </div>

      <button
        v-else
        type="button"
        class="py-2 text-sm font-medium text-center border rounded-lg text-n-brand border-n-weak hover:bg-n-alpha-2"
        @click="listOpen = true"
      >
        {{ t('CATALOG.PRODUCT.VIEW_ITEMS') }}
      </button>

      <div v-if="catalog.footer" class="text-xs break-words text-n-slate-11">
        {{ catalog.footer }}
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="listOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-n-alpha-black1 max-sm:bg-n-background"
        data-test-id="catalog-list"
        @click.self="listOpen = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="flex flex-col w-full max-w-md overflow-y-auto border rounded-xl bg-n-solid-2 border-n-weak max-h-[90vh] max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none"
        >
          <div class="flex items-center justify-between p-3">
            <span class="font-medium">{{ collectionName }}</span>
            <button
              type="button"
              class="px-3 py-1 text-sm rounded-lg hover:bg-n-alpha-2"
              @click="listOpen = false"
            >
              {{ t('CATALOG.ACTIONS.CLOSE') }}
            </button>
          </div>
          <button
            v-for="item in items"
            :key="item.retailerId"
            type="button"
            class="flex items-center gap-3 p-3 text-start border-t border-n-weak hover:bg-n-alpha-2"
            data-test-id="catalog-list-row"
            @click="detailItem = item"
          >
            <img
              v-if="firstImage(item)"
              :src="firstImage(item)"
              :alt="item.name"
              loading="lazy"
              class="object-cover rounded-md size-12"
            />
            <span v-else class="rounded-md size-12 bg-n-alpha-2" />
            <span class="flex flex-col min-w-0">
              <span class="text-sm font-medium truncate">{{ item.name }}</span>
              <span class="text-sm text-n-slate-11">{{ item.price }}</span>
            </span>
          </button>
        </div>
      </div>
    </Teleport>

    <WhatsappCatalogDetail
      v-if="detailItem"
      :item="detailItem"
      @close="detailItem = null"
    />
  </BaseBubble>
</template>
