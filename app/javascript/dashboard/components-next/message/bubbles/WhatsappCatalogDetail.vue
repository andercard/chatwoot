<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import NextButton from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  item: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const { t } = useI18n();
const photoIndex = ref(0);
const gallery = ref(null);

const images = computed(() => props.item.imageUrls || []);

const showPhoto = step => {
  const total = images.value.length;
  const target = (photoIndex.value + step + total) % total;
  gallery.value.scrollTo({
    left: target * gallery.value.clientWidth,
    behavior: 'smooth',
  });
};

const onScroll = () => {
  const { scrollLeft, clientWidth } = gallery.value;
  if (clientWidth) photoIndex.value = Math.round(scrollLeft / clientWidth);
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
        class="flex flex-col w-full max-w-md overflow-hidden bg-n-solid-2 border border-n-weak rounded-xl shadow-lg max-h-[90vh] max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none max-sm:border-0"
      >
        <div
          class="relative flex items-center shrink-0 h-12 px-2 border-b border-n-weak"
          data-test-id="catalog-detail-bar"
        >
          <NextButton
            icon="i-lucide-chevron-left"
            slate
            faded
            sm
            class="!rounded-full"
            :aria-label="t('CATALOG.ACTIONS.CLOSE')"
            data-test-id="catalog-detail-close"
            @click="emit('close')"
          />
          <h2
            class="absolute inset-x-14 text-base font-medium text-center truncate text-n-slate-12"
          >
            {{ t('CATALOG.PRODUCT.DETAILS_TITLE') }}
          </h2>
        </div>
        <div class="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div class="relative w-full shrink-0 bg-n-alpha-2">
            <div
              v-if="images.length"
              ref="gallery"
              class="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              data-test-id="catalog-gallery"
              @scroll="onScroll"
            >
              <img
                v-for="(image, index) in images"
                :key="image"
                :src="image"
                :alt="`${item.name} ${index + 1}`"
                loading="lazy"
                class="object-contain w-full shrink-0 snap-center aspect-[4/3]"
              />
            </div>
            <div
              v-else
              class="flex items-center justify-center aspect-[4/3] text-n-slate-10"
            >
              <span class="i-lucide-image size-10" />
            </div>
            <template v-if="images.length > 1">
              <span
                class="absolute px-2 py-0.5 text-xs text-white rounded-full bottom-2 end-2 bg-n-alpha-black2"
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
                class="absolute px-2 py-1 text-white -translate-y-1/2 rounded-full start-2 top-1/2 bg-n-alpha-black2 max-sm:hidden"
                @click="showPhoto(-1)"
              >
                <span class="i-lucide-chevron-left size-4" />
              </button>
              <button
                type="button"
                class="absolute px-2 py-1 text-white -translate-y-1/2 rounded-full end-2 top-1/2 bg-n-alpha-black2 max-sm:hidden"
                @click="showPhoto(1)"
              >
                <span class="i-lucide-chevron-right size-4" />
              </button>
            </template>
          </div>
          <div class="flex flex-col gap-2 px-4 py-4 min-w-0">
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
              <p
                class="text-sm whitespace-pre-wrap break-words text-n-slate-11"
              >
                {{ item.description }}
              </p>
            </div>
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm break-all text-n-teal-10 hover:underline"
              data-test-id="catalog-detail-link"
            >
              {{ item.url }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
