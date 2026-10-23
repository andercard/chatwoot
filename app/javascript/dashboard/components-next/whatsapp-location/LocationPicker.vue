<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import whatsappLocationMessages from 'dashboard/api/whatsappLocationMessages';
import CatalogSheet from 'dashboard/components-next/whatsapp-catalog/CatalogSheet.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  conversationId: { type: Number, default: undefined },
  locations: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:show', 'sent']);

const { t } = useI18n();

const isBusy = ref(false);

const close = () => emit('update:show', false);

watch(
  () => props.show,
  show => {
    if (!show) isBusy.value = false;
  }
);

const send = async payload => {
  isBusy.value = true;
  try {
    await whatsappLocationMessages.create(props.conversationId, payload);
    useAlert(t('WHATSAPP_LOCATIONS.SELECTOR.SEND_SUCCESS'));
    emit('sent');
    close();
  } catch (error) {
    useAlert(
      error?.response?.data?.error ||
        error?.response?.data?.message ||
        t('WHATSAPP_LOCATIONS.SELECTOR.SEND_ERROR')
    );
  } finally {
    isBusy.value = false;
  }
};

const sendSaved = location => {
  if (isBusy.value) return;
  send({ location_id: location.id });
};

const sendCurrent = () => {
  if (isBusy.value) return;
  if (!navigator.geolocation) {
    useAlert(t('WHATSAPP_LOCATIONS.SELECTOR.UNSUPPORTED'));
    return;
  }
  isBusy.value = true;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) =>
      send({ latitude: coords.latitude, longitude: coords.longitude }),
    () => {
      isBusy.value = false;
      useAlert(t('WHATSAPP_LOCATIONS.SELECTOR.PERMISSION_DENIED'));
    }
  );
};

const hasSaved = computed(() => props.locations.length > 0);
</script>

<template>
  <CatalogSheet
    :show="show"
    :title="t('WHATSAPP_LOCATIONS.SELECTOR.TITLE')"
    size="lg"
    @close="close"
  >
    <ul class="flex flex-col m-0 list-none">
      <li>
        <button
          type="button"
          class="flex items-center w-full gap-3 px-4 py-3 text-start border-b border-n-weak hover:bg-n-alpha-1 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isBusy"
          data-test-id="location-picker-current"
          @click="sendCurrent"
        >
          <Icon
            icon="i-lucide-locate-fixed"
            class="size-5 shrink-0 text-n-blue-text"
          />
          <span class="flex flex-col min-w-0">
            <span class="text-sm font-medium truncate text-n-slate-12">
              {{ t('WHATSAPP_LOCATIONS.SELECTOR.CURRENT_LOCATION') }}
            </span>
            <span class="text-xs text-n-slate-11">
              {{ t('WHATSAPP_LOCATIONS.SELECTOR.CURRENT_LOCATION_HINT') }}
            </span>
          </span>
        </button>
      </li>
      <li v-for="location in locations" :key="location.id">
        <button
          type="button"
          class="flex items-center w-full gap-3 px-4 py-3 text-start border-b border-n-weak hover:bg-n-alpha-1 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isBusy"
          data-test-id="location-picker-saved"
          @click="sendSaved(location)"
        >
          <Icon
            icon="i-lucide-map-pin"
            class="size-5 shrink-0 text-n-slate-11"
          />
          <span class="flex flex-col min-w-0">
            <span class="text-sm font-medium truncate text-n-slate-12">
              {{ location.name }}
            </span>
            <span class="text-xs truncate text-n-slate-11">
              {{ location.address }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <p v-if="!hasSaved" class="px-4 py-6 text-sm text-center text-n-slate-11">
      {{ t('WHATSAPP_LOCATIONS.SELECTOR.EMPTY_SAVED') }}
    </p>
  </CatalogSheet>
</template>
