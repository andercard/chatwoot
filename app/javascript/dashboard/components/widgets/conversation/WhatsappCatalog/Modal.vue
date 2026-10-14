<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import inboxesAPI from 'dashboard/api/inboxes';
import whatsappCatalogMessages from 'dashboard/api/whatsappCatalogMessages';
import { useAdmin } from 'dashboard/composables/useAdmin';
import {
  CATALOG_KINDS,
  CATALOG_ITEM_LIMITS,
  CATALOG_TEXT_LIMITS,
  validateCatalogForm,
} from 'dashboard/helper/whatsappCatalog';

import Button from 'dashboard/components-next/button/Button.vue';
import ProductRow from './ProductRow.vue';
import SetupGuide from './SetupGuide.vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  inboxId: { type: Number, default: undefined },
  conversationId: { type: Number, default: undefined },
  initialBody: { type: String, default: '' },
});

const emit = defineEmits(['update:show', 'sent', 'close']);

const { t } = useI18n();
const { isAdmin } = useAdmin();

const STEPS = ['FORMAT', 'PRODUCTS', 'DETAILS'];
const FORMAT_OPTIONS = [
  { kind: CATALOG_KINDS.CAROUSEL, key: 'CAROUSEL' },
  { kind: CATALOG_KINDS.PRODUCT, key: 'PRODUCT' },
  { kind: CATALOG_KINDS.PRODUCT_LIST, key: 'PRODUCT_LIST' },
];
const FIELDS_BY_KIND = {
  [CATALOG_KINDS.CAROUSEL]: [{ name: 'body', required: true }],
  [CATALOG_KINDS.PRODUCT]: [
    { name: 'body', required: false },
    { name: 'footer', required: false },
  ],
  [CATALOG_KINDS.PRODUCT_LIST]: [
    { name: 'header', required: true },
    { name: 'body', required: true },
    { name: 'footer', required: false },
  ],
};

const step = ref(0);
const kind = ref(null);
const catalog = ref(null);
const isLoading = ref(false);
const loadFailed = ref(false);
const selected = ref([]);
const form = ref({ header: '', body: '', footer: '' });
const submitted = ref(false);
const isSending = ref(false);
const sendError = ref('');

const limits = computed(() => CATALOG_ITEM_LIMITS[kind.value] || {});
const fields = computed(() => FIELDS_BY_KIND[kind.value] || []);
const isMultiple = computed(() => limits.value.max > 1);
const atMax = computed(() => selected.value.length >= limits.value.max);

const sections = computed(() =>
  (catalog.value?.collections || []).map(collection => ({
    id: collection.id,
    title: collection.name || t('CATALOG.NO_COLLECTION'),
    products: collection.products || [],
  }))
);
const hasProducts = computed(() =>
  sections.value.some(section => section.products.length)
);
const needsGuide = computed(
  () => catalog.value && catalog.value.status !== 'ok'
);

const items = computed(() =>
  selected.value.map(({ product, section }) => ({
    retailer_id: product.retailer_id,
    name: product.name,
    price: product.price,
    description: product.description,
    url: product.url,
    section,
    image_urls: product.image_urls,
  }))
);

const validationPayload = computed(() => ({
  kind: kind.value,
  items: items.value,
  body: form.value.body,
  header: fields.value.some(f => f.name === 'header') ? form.value.header : '',
  footer: fields.value.some(f => f.name === 'footer') ? form.value.footer : '',
}));
const errors = computed(() =>
  kind.value ? validateCatalogForm(validationPayload.value) : {}
);

const errorText = field =>
  submitted.value && errors.value[field]
    ? t(errors.value[field], {
        min: limits.value.min,
        max: limits.value.max,
        count: items.value.length,
      })
    : '';

const isSelected = product =>
  selected.value.some(item => item.product.retailer_id === product.retailer_id);

const toggleProduct = (product, section) => {
  if (isSelected(product)) {
    selected.value = selected.value.filter(
      item => item.product.retailer_id !== product.retailer_id
    );
  } else if (!isMultiple.value) {
    selected.value = [{ product, section }];
  } else if (!atMax.value) {
    selected.value = [...selected.value, { product, section }];
  }
};

const loadCatalog = async () => {
  if (catalog.value || isLoading.value) return;
  isLoading.value = true;
  loadFailed.value = false;
  try {
    const { data } = await inboxesAPI.getWhatsappCatalog(props.inboxId);
    catalog.value = data;
  } catch (error) {
    loadFailed.value = true;
  } finally {
    isLoading.value = false;
  }
};

const reset = () => {
  step.value = 0;
  kind.value = null;
  catalog.value = null;
  loadFailed.value = false;
  selected.value = [];
  form.value = { header: '', body: props.initialBody, footer: '' };
  submitted.value = false;
  sendError.value = '';
};

const close = () => {
  emit('update:show', false);
  emit('close');
};

const chooseKind = value => {
  if (kind.value !== value) selected.value = [];
  kind.value = value;
  step.value = 1;
  loadCatalog();
};

const retryLoad = () => {
  catalog.value = null;
  loadCatalog();
};

const goBack = () => {
  sendError.value = '';
  step.value = Math.max(0, step.value - 1);
};

const goNext = () => {
  if (step.value === 1) {
    submitted.value = true;
    if (errors.value.items) return;
    submitted.value = false;
    if (!form.value.header && kind.value === CATALOG_KINDS.PRODUCT_LIST) {
      form.value.header = (sections.value[0]?.title || '').slice(
        0,
        CATALOG_TEXT_LIMITS.header
      );
    }
  }
  step.value += 1;
};

const send = async () => {
  submitted.value = true;
  sendError.value = '';
  if (Object.keys(errors.value).length) return;
  isSending.value = true;
  try {
    await whatsappCatalogMessages.create(props.conversationId, {
      kind: kind.value,
      content: form.value.body.trim(),
      header: validationPayload.value.header.trim(),
      footer: validationPayload.value.footer.trim(),
      catalog_id: catalog.value.catalog_id,
      products: items.value,
    });
    emit('sent');
    close();
  } catch (error) {
    sendError.value =
      error?.response?.data?.error || t('CATALOG.ERRORS.SEND_FAILED');
  } finally {
    isSending.value = false;
  }
};

watch(
  () => props.show,
  value => {
    if (value) reset();
  },
  { immediate: true }
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-n-alpha-black1 backdrop-blur-[4px] max-sm:items-end"
      @click.self="close"
    >
      <div
        class="flex flex-col w-full max-w-2xl max-h-[90dvh] overflow-hidden shadow-xl bg-n-solid-2 rounded-xl max-sm:max-w-full max-sm:rounded-b-none"
        role="dialog"
        data-testid="catalog-modal"
      >
        <header class="flex flex-col gap-3 p-4 border-b border-n-weak shrink-0">
          <div class="flex items-center justify-between gap-2">
            <h3 class="mb-0 text-base font-medium text-n-slate-12">
              {{ $t('CATALOG.TITLE') }}
            </h3>
            <Button
              type="button"
              variant="ghost"
              color="slate"
              size="sm"
              icon="i-lucide-x"
              :label="$t('CATALOG.ACTIONS.CLOSE')"
              @click="close"
            />
          </div>
          <ol class="flex gap-4 mb-0 text-xs list-none">
            <li
              v-for="(name, index) in STEPS"
              :key="name"
              :class="
                index === step
                  ? 'font-medium text-n-slate-12'
                  : 'text-n-slate-10'
              "
            >
              {{ index + 1 }}. {{ $t(`CATALOG.STEPS.${name}`) }}
            </li>
          </ol>
        </header>

        <div class="flex-1 min-h-0 p-4 overflow-y-auto">
          <div v-if="step === 0" class="flex flex-col gap-2">
            <button
              v-for="option in FORMAT_OPTIONS"
              :key="option.kind"
              type="button"
              class="flex flex-col items-start gap-1 p-3 text-start rounded-lg outline outline-1 -outline-offset-1 outline-n-container hover:bg-n-alpha-2"
              :data-testid="`catalog-format-${option.kind}`"
              @click="chooseKind(option.kind)"
            >
              <span class="text-sm font-medium text-n-slate-12">
                {{ $t(`CATALOG.FORMATS.${option.key}.NAME`) }}
              </span>
              <span class="text-xs text-n-slate-11">
                {{ $t(`CATALOG.FORMATS.${option.key}.RULE`) }}
              </span>
            </button>
          </div>

          <template v-else-if="step === 1">
            <p v-if="isLoading" class="mb-0 text-sm text-n-slate-11">
              {{ $t('CATALOG.STATES.LOADING') }}
            </p>
            <div v-else-if="loadFailed" class="flex flex-col gap-3">
              <p class="mb-0 text-sm text-n-ruby-11">
                {{ $t('CATALOG.STATES.ERROR') }}
              </p>
              <div>
                <Button
                  type="button"
                  variant="faded"
                  color="slate"
                  :label="$t('CATALOG.SETUP_GUIDE.ERROR.TITLE')"
                  @click="retryLoad"
                />
              </div>
            </div>
            <SetupGuide
              v-else-if="needsGuide"
              :status="catalog.status"
              :is-admin="isAdmin"
              :inbox-id="inboxId"
              @close="close"
            />
            <p v-else-if="!hasProducts" class="mb-0 text-sm text-n-slate-11">
              {{ $t('CATALOG.STATES.EMPTY') }}
            </p>
            <div v-else class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <span
                  class="text-sm font-medium text-n-slate-12"
                  data-testid="catalog-counter"
                >
                  {{
                    $t('CATALOG.COUNTER', {
                      count: selected.length,
                      max: limits.max,
                    })
                  }}
                </span>
                <span v-if="errorText('items')" class="text-xs text-n-ruby-11">
                  {{ errorText('items') }}
                </span>
              </div>
              <section
                v-for="(section, sectionIndex) in sections"
                :key="section.id ?? `none-${sectionIndex}`"
                class="flex flex-col gap-2"
              >
                <h5 class="mb-0 text-xs font-medium uppercase text-n-slate-11">
                  {{ section.title }}
                </h5>
                <ProductRow
                  v-for="product in section.products"
                  :key="product.retailer_id"
                  :product="product"
                  :multiple="isMultiple"
                  :checked="isSelected(product)"
                  :disabled="!isSelected(product) && isMultiple && atMax"
                  @toggle="toggleProduct($event, section.title)"
                />
              </section>
            </div>
          </template>

          <div v-else class="flex flex-col gap-4">
            <div
              v-for="field in fields"
              :key="field.name"
              class="flex flex-col gap-1"
            >
              <label
                class="flex items-center justify-between gap-2 text-sm font-medium text-n-slate-12"
                :for="`catalog-${field.name}`"
              >
                <span>{{
                  $t(`CATALOG.FIELDS.${field.name.toUpperCase()}`)
                }}</span>
                <span class="text-xs font-normal text-n-slate-11">
                  {{
                    field.required
                      ? $t('CATALOG.FIELDS.REQUIRED')
                      : $t('CATALOG.FIELDS.OPTIONAL')
                  }}
                </span>
              </label>
              <textarea
                :id="`catalog-${field.name}`"
                v-model="form[field.name]"
                :rows="field.name === 'body' ? 4 : 1"
                class="mb-0"
                :data-testid="`catalog-field-${field.name}`"
              />
              <div class="flex justify-between gap-2 text-xs">
                <span class="text-n-ruby-11">{{ errorText(field.name) }}</span>
                <span class="text-n-slate-11">
                  {{
                    $t('CATALOG.FIELDS.CHARACTERS', {
                      count: form[field.name].length,
                      max: CATALOG_TEXT_LIMITS[field.name],
                    })
                  }}
                </span>
              </div>
            </div>
            <p
              v-if="sendError"
              class="mb-0 text-sm text-n-ruby-11"
              data-testid="catalog-send-error"
            >
              {{ sendError }}
            </p>
          </div>
        </div>

        <footer
          v-if="step > 0"
          class="flex items-center justify-between gap-3 p-4 border-t border-n-weak shrink-0"
        >
          <Button
            type="button"
            variant="faded"
            color="slate"
            :label="$t('CATALOG.ACTIONS.BACK')"
            @click="goBack"
          />
          <Button
            v-if="step === 1"
            type="button"
            color="blue"
            :label="$t('CATALOG.ACTIONS.NEXT')"
            :disabled="needsGuide || isLoading || loadFailed"
            data-testid="catalog-next"
            @click="goNext"
          />
          <Button
            v-else
            type="button"
            color="blue"
            :label="$t('CATALOG.ACTIONS.SEND')"
            :is-loading="isSending"
            :disabled="isSending"
            data-testid="catalog-send"
            @click="send"
          />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
