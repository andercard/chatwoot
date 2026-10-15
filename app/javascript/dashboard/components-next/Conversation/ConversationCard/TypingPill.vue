<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  users: { type: Array, required: true },
});

const { t } = useI18n();

const label = computed(() => {
  const [first, second] = props.users;
  if (props.users.length === 1) {
    return t('CHAT_LIST.TYPING_ONE', { user: first.name });
  }
  if (props.users.length === 2) {
    return t('CHAT_LIST.TYPING_TWO', {
      user: first.name,
      secondUser: second.name,
    });
  }
  return t('CHAT_LIST.TYPING_MULTIPLE', { count: props.users.length });
});
</script>

<template>
  <span
    :title="label"
    class="block max-w-28 truncate rounded-full bg-n-blue-3 px-2 py-0.5 text-xxs font-medium leading-3 text-n-blue-11"
  >
    {{ label }}
  </span>
</template>
