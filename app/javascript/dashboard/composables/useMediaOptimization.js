import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { resolveMaximumFileUploadSize } from 'shared/helpers/FileHelper';
import { isOptimizableImageMime } from 'dashboard/helper/imageOptimizationPolicy';
import {
  getVideoOptimizationPolicy,
  isOptimizableVideoMime,
} from 'dashboard/helper/videoOptimizationPolicy';
import { prepareImage, prepareVideo } from 'dashboard/helper/mediaPreparation';

// There is no inbox outside a conversation, and WhatsApp is the channel the files are optimized for
const WHATSAPP_INBOX = { channel_type: INBOX_TYPES.WHATSAPP };

export function useMediaOptimization() {
  const { t } = useI18n();
  const globalConfig = useMapGetter('globalConfig/get');
  const installationLimit = computed(() =>
    resolveMaximumFileUploadSize(globalConfig.value.maximumFileUploadSize)
  );

  const canToggleHd = mime =>
    isOptimizableImageMime(mime) ||
    !!getVideoOptimizationPolicy({
      inbox: WHATSAPP_INBOX,
      mime,
      installationLimit: installationLimit.value,
    });

  // Takes and returns the same `{ file, name, type, size, originalFile }` shape as the composer upload flow.
  // Returns null when the file must not be attached (the reason was already shown to the agent).
  const prepareMedia = (
    file,
    { profile = 'standard', onProgress, signal } = {}
  ) => {
    const mime = file.file?.type || file.type;
    const options = {
      profile,
      inbox: WHATSAPP_INBOX,
      installationLimit: installationLimit.value,
      t,
    };
    if (isOptimizableImageMime(mime)) return prepareImage(file, options);
    if (isOptimizableVideoMime(mime)) {
      return prepareVideo(file, { ...options, onProgress, signal });
    }
    return file;
  };

  return { installationLimit, canToggleHd, prepareMedia };
}
