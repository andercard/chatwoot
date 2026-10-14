<script setup>
import router from '../../routes/index';
const props = defineProps({
  backUrl: {
    type: [String, Object],
    default: '',
  },
  buttonLabel: {
    type: String,
    default: '',
  },
  compact: {
    type: Boolean,
    default: false,
  },
  // Only the chevron, in a button big enough for a thumb
  iconOnly: {
    type: Boolean,
    default: false,
  },
});

const goBack = () => {
  if (props.backUrl !== '') {
    router.push(props.backUrl);
  } else {
    router.go(-1);
  }
};

const buttonStyleClass = props.compact ? 'text-sm' : 'text-base';
</script>

<template>
  <button
    type="button"
    class="flex items-center font-normal cursor-pointer text-n-slate-11"
    :class="
      iconOnly
        ? 'justify-center size-10 shrink-0 rounded-full hover:bg-n-alpha-2'
        : ['p-0', buttonStyleClass]
    "
    :aria-label="iconOnly ? $t('GENERAL_SETTINGS.BACK') : undefined"
    @click.capture="goBack"
  >
    <i
      class="i-lucide-chevron-left text-lg"
      :class="iconOnly ? 'text-2xl' : '-ml-1'"
    />
    <template v-if="!iconOnly">
      {{ buttonLabel || $t('GENERAL_SETTINGS.BACK') }}
    </template>
  </button>
</template>
