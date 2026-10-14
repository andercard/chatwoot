<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  item: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const photoIndex = ref(0);

const images = computed(() => props.item.imageUrls || []);

const showPhoto = step => {
  const total = images.value.length;
  photoIndex.value = (photoIndex.value + step + total) % total;
};

const onKeydown = event => {
  if (event.key === 'Escape') emit('close');
};

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[10000] flex items-center justify-center bg-n-alpha-black1 backdrop-blur-sm max-sm:bg-n-background"
      data-test-id="catalog-detail"
      @click.self="emit('close')"
    >
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="item.name"
        class="flex flex-col w-full max-w-md overflow-y-auto bg-n-solid-2 border border-n-weak rounded-xl shadow-lg max-h-[90vh] max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none max-sm:border-0"
      >
        <div class="flex justify-end p-2">
          <button
            type="button"
            class="px-3 py-1 text-sm rounded-lg text-n-slate-12 hover:bg-n-alpha-2"
            :aria-label="t('CATALOG.ACTIONS.CLOSE')"
            @click="emit('close')"
          >
            {{ t('CATALOG.ACTIONS.CLOSE') }}
          </button>
        </div>
        <div class="relative w-full aspect-square bg-n-alpha-2">
          <img
            v-if="images.length"
            :src="images[photoIndex]"
            :alt="item.name"
            loading="lazy"
            class="object-cover size-full"
          />
          <div
            v-else
            class="flex items-center justify-center size-full text-n-slate-10"
          >
            <span class="i-lucide-image size-10" />
          </div>
          <template v-if="images.length > 1">
            <span
              class="absolute px-2 py-0.5 text-xs rounded-full bottom-2 end-2 bg-n-alpha-black2 text-white"
              data-test-id="catalog-photo-indicator"
            >
              {{
                t('CATALOG.PRODUCT.PHOTO_OF', {
                  current: photoIndex + 1,
                  total: images.length,
                })
              }}
            </span>
            <button
              type="button"
              class="absolute px-2 py-1 text-white -translate-y-1/2 rounded-full start-2 top-1/2 bg-n-alpha-black2"
              @click="showPhoto(-1)"
            >
              <span class="i-lucide-chevron-left size-4" />
            </button>
            <button
              type="button"
              class="absolute px-2 py-1 text-white -translate-y-1/2 rounded-full end-2 top-1/2 bg-n-alpha-black2"
              @click="showPhoto(1)"
            >
              <span class="i-lucide-chevron-right size-4" />
            </button>
          </template>
        </div>
        <div class="flex flex-col gap-2 p-4 min-w-0">
          <h3 class="text-base font-semibold break-words text-n-slate-12">
            {{ item.name }}
          </h3>
          <p v-if="item.price" class="text-sm font-medium text-n-slate-12">
            {{ item.price }}
          </p>
          <div v-if="item.description">
            <div class="text-xs text-n-slate-11">
              {{ t('CATALOG.PRODUCT.DESCRIPTION') }}
            </div>
            <p class="text-sm whitespace-pre-wrap break-words text-n-slate-12">
              {{ item.description }}
            </p>
          </div>
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm break-all text-n-brand hover:underline"
          >
            {{ t('CATALOG.PRODUCT.LINK') }}
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>
