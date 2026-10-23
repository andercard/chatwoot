<script setup>
import { ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import WhatsappLocationsAPI from 'dashboard/api/whatsappLocations';
import NextButton from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';

const props = defineProps({
  inbox: { type: Object, default: () => ({}) },
});

const MAX_LOCATIONS = 50;

const store = useStore();
const { t } = useI18n();

const toRows = locations =>
  (locations || []).map(location => ({
    id: location.id,
    name: location.name,
    address: location.address,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
  }));

const rows = ref(toRows(props.inbox.locations));
const errors = ref([]);
const isSaving = ref(false);

watch(
  () => props.inbox.locations,
  locations => {
    rows.value = toRows(locations);
    errors.value = [];
  }
);

const inRange = (value, limit) => {
  const number = Number(value);
  return value.trim() !== '' && Math.abs(number) <= limit;
};

const validateRow = row => {
  const required = t('WHATSAPP_LOCATIONS.FORM.ERRORS.REQUIRED');
  const result = {};
  if (!row.name.trim()) result.name = required;
  if (!row.address.trim()) result.address = required;
  if (!row.latitude.trim()) result.latitude = required;
  else if (!inRange(row.latitude, 90)) {
    result.latitude = t('WHATSAPP_LOCATIONS.FORM.ERRORS.LATITUDE_RANGE');
  }
  if (!row.longitude.trim()) result.longitude = required;
  else if (!inRange(row.longitude, 180)) {
    result.longitude = t('WHATSAPP_LOCATIONS.FORM.ERRORS.LONGITUDE_RANGE');
  }
  return result;
};

const addLocation = () => {
  if (rows.value.length >= MAX_LOCATIONS) return;
  rows.value.push({ name: '', address: '', latitude: '', longitude: '' });
  errors.value.push({});
};

const removeLocation = index => {
  rows.value.splice(index, 1);
  errors.value.splice(index, 1);
};

const save = async () => {
  errors.value = rows.value.map(validateRow);
  if (errors.value.some(error => Object.keys(error).length)) return;

  isSaving.value = true;
  try {
    await WhatsappLocationsAPI.update(
      props.inbox.id,
      rows.value.map(row => ({
        ...(row.id && { id: row.id }),
        name: row.name.trim(),
        address: row.address.trim(),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      }))
    );
    await store.dispatch('inboxes/get', props.inbox.id);
    useAlert(t('WHATSAPP_LOCATIONS.API.SAVE_SUCCESS'));
  } catch (error) {
    useAlert(
      error?.response?.data?.message || t('WHATSAPP_LOCATIONS.API.SAVE_ERROR')
    );
  } finally {
    isSaving.value = false;
  }
};

const fields = ['name', 'address', 'latitude', 'longitude'];
</script>

<template>
  <div class="flex flex-col gap-4 mx-6 max-w-4xl">
    <p class="text-sm text-n-slate-11 mb-0">
      {{ t('WHATSAPP_LOCATIONS.DESCRIPTION') }}
    </p>

    <p
      v-if="!rows.length"
      class="text-sm text-n-slate-11 py-6 text-center mb-0"
    >
      {{ t('WHATSAPP_LOCATIONS.FORM.EMPTY_STATE') }}
    </p>

    <div
      v-for="(row, index) in rows"
      :key="row.id || index"
      class="flex flex-col gap-3 p-4 rounded-xl outline outline-1 outline-n-weak"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          v-for="field in fields"
          :key="field"
          v-model="row[field]"
          :label="t(`WHATSAPP_LOCATIONS.FORM.${field.toUpperCase()}.LABEL`)"
          :placeholder="
            t(`WHATSAPP_LOCATIONS.FORM.${field.toUpperCase()}.PLACEHOLDER`)
          "
          :type="field === 'name' || field === 'address' ? 'text' : 'number'"
          :message="errors[index]?.[field] || ''"
          :message-type="errors[index]?.[field] ? 'error' : 'info'"
        />
      </div>
      <div class="flex justify-end">
        <NextButton
          ruby
          faded
          sm
          icon="i-lucide-trash-2"
          :label="t('WHATSAPP_LOCATIONS.FORM.DELETE')"
          @click="removeLocation(index)"
        />
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-2 sm:justify-between">
      <NextButton
        slate
        faded
        icon="i-lucide-plus"
        :label="t('WHATSAPP_LOCATIONS.FORM.ADD')"
        :disabled="rows.length >= MAX_LOCATIONS"
        @click="addLocation"
      />
      <NextButton
        blue
        :label="t('WHATSAPP_LOCATIONS.FORM.SAVE')"
        :is-loading="isSaving"
        @click="save"
      />
    </div>
  </div>
</template>
