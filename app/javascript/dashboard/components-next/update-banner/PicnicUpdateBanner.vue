<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Banner from 'dashboard/components/ui/Banner.vue';
import { hasAnUpdateAvailable } from 'dashboard/components/app/versionCheckHelper';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useMapGetter } from 'dashboard/composables/store';
import { LocalStorage } from 'shared/helpers/localStorage';

const props = defineProps({
  installedRelease: { type: String, default: '' },
  latestRelease: { type: String, default: '' },
});

const PICNIC_RELEASES_URL = 'https://github.com/andercard/chatwoot/tags';

const { t } = useI18n();
const { isAdmin } = useAdmin();
const globalConfig = useMapGetter('globalConfig/get');

const userDismissedBanner = ref(false);

const getDismissedVersions = () => {
  const dismissed = LocalStorage.get(
    LOCAL_STORAGE_KEYS.DISMISSED_PICNIC_UPDATES
  );
  return Array.isArray(dismissed) ? dismissed : [];
};

const shouldShowBanner = computed(
  () =>
    !userDismissedBanner.value &&
    isAdmin.value &&
    globalConfig.value.displayManifest &&
    !!props.installedRelease &&
    !!props.latestRelease &&
    hasAnUpdateAvailable(props.latestRelease, props.installedRelease) &&
    !getDismissedVersions().includes(props.latestRelease)
);

const dismissUpdateBanner = () => {
  LocalStorage.set(LOCAL_STORAGE_KEYS.DISMISSED_PICNIC_UPDATES, [
    ...getDismissedVersions(),
    props.latestRelease,
  ]);
  userDismissedBanner.value = true;
};
</script>

<!-- eslint-disable-next-line vue/no-root-v-if -->
<template>
  <Banner
    v-if="shouldShowBanner"
    color-scheme="primary"
    :banner-message="
      t('GENERAL_SETTINGS.UPDATE_PICNIC_RELEASE', {
        latestPicnicRelease: latestRelease,
      })
    "
    :href-link="PICNIC_RELEASES_URL"
    :href-link-text="t('GENERAL_SETTINGS.LEARN_MORE')"
    has-close-button
    @close="dismissUpdateBanner"
  />
</template>
