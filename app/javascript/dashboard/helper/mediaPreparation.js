import { useAlert } from 'dashboard/composables';
import {
  getImageOptimizationPolicy,
  imageNeedsOptimization,
  getImageLadder,
  getProfileMaxSide,
} from 'dashboard/helper/imageOptimizationPolicy';
import {
  getVideoOptimizationPolicy,
  getVideoLadder,
  videoNeedsCodecFix,
  videoNeedsOptimization,
} from 'dashboard/helper/videoOptimizationPolicy';
import {
  optimizeImage,
  getLongestSide,
  ImageOptimizationError,
  IMAGE_OPTIMIZATION_ERRORS,
} from 'shared/helpers/imageOptimizer';
import {
  canEncodeVideoAudio,
  optimizeVideo,
  probeVideo,
  VideoOptimizationError,
  VIDEO_OPTIMIZATION_ERRORS,
} from 'shared/helpers/videoOptimizer';

const noTracking = () => () => {};

const withOptimizedFile = (file, optimized) => ({
  ...file,
  file: optimized.file,
  name: optimized.file.name,
  type: optimized.file.type,
  size: optimized.file.size,
  originalFile: file.originalFile || file,
});

// `track` is called when the work starts and returns the function that marks it as finished.
// Returns the file to upload (optimized or the original) or null when it must not be attached.
export const prepareImage = async (
  file,
  { profile = 'standard', inbox, installationLimit, t, track = noTracking }
) => {
  const mime = file.file?.type || file.type;
  const policy = getImageOptimizationPolicy({ inbox, mime, installationLimit });
  if (!policy) return file;

  const native = file.file || file;
  const { size } = native;
  let longestSide;
  if (getProfileMaxSide(policy, profile) && size <= policy.limitBytes) {
    try {
      longestSide = await getLongestSide(native);
    } catch (e) {
      longestSide = undefined;
    }
  }

  if (!imageNeedsOptimization(policy, profile, { size, longestSide })) {
    return file;
  }

  const release = track();
  try {
    const optimized = await optimizeImage(native, {
      maxBytes: policy.maxBytes,
      ladder: getImageLadder(policy, profile),
    });
    return withOptimizedFile(file, optimized);
  } catch (error) {
    const code =
      error instanceof ImageOptimizationError
        ? error.code
        : IMAGE_OPTIMIZATION_ERRORS.DECODE_FAILED;
    if (code === IMAGE_OPTIMIZATION_ERRORS.TOO_LARGE) {
      useAlert(t('CONVERSATION.IMAGE_OPTIMIZATION.TOO_LARGE'));
      return null;
    }
    const fits = size <= policy.limitBytes;
    const unsupported = code === IMAGE_OPTIMIZATION_ERRORS.UNSUPPORTED;
    let message;
    if (unsupported) {
      message = fits
        ? t('CONVERSATION.IMAGE_OPTIMIZATION.UNSUPPORTED_USING_ORIGINAL')
        : t('CONVERSATION.IMAGE_OPTIMIZATION.UNSUPPORTED');
    } else {
      message = fits
        ? t('CONVERSATION.IMAGE_OPTIMIZATION.FAILED_USING_ORIGINAL')
        : t('CONVERSATION.IMAGE_OPTIMIZATION.FAILED');
    }
    useAlert(message);
    // An original that is over the channel limit must never be attached
    return fits ? file : null;
  } finally {
    release();
  }
};

export const prepareVideo = async (
  file,
  {
    profile = 'standard',
    inbox,
    installationLimit,
    t,
    track = noTracking,
    onProgress,
    signal,
  }
) => {
  const mime = file.file?.type || file.type;
  const policy = getVideoOptimizationPolicy({ inbox, mime, installationLimit });
  if (!policy) return file;

  const native = file.file || file;
  const { size } = native;
  const fits = size <= policy.limitBytes;
  const release = track();
  try {
    let probe;
    try {
      probe = await probeVideo(native);
    } catch (error) {
      useAlert(
        fits
          ? t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED_USING_ORIGINAL')
          : t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED')
      );
      return fits ? file : null;
    }

    if (!videoNeedsOptimization(policy, profile, probe, { size, mime })) {
      return file;
    }

    // An original over the channel limit or in a format WhatsApp can't play must never be attached
    const usableAsIs = fits && !videoNeedsCodecFix(probe, { mime });
    if (!(await canEncodeVideoAudio())) {
      useAlert(
        usableAsIs
          ? t('CONVERSATION.VIDEO_OPTIMIZATION.UNSUPPORTED_USING_ORIGINAL')
          : t('CONVERSATION.VIDEO_OPTIMIZATION.UNSUPPORTED')
      );
      return usableAsIs ? file : null;
    }

    try {
      const optimized = await optimizeVideo(native, {
        maxBytes: policy.maxBytes,
        ladder: getVideoLadder(policy, profile),
        signal,
        onProgress,
      });
      return withOptimizedFile(file, optimized);
    } catch (error) {
      const code =
        error instanceof VideoOptimizationError
          ? error.code
          : VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED;
      if (code === VIDEO_OPTIMIZATION_ERRORS.CANCELED) return null;
      if (code === VIDEO_OPTIMIZATION_ERRORS.TOO_LARGE) {
        useAlert(t('CONVERSATION.VIDEO_OPTIMIZATION.TOO_LARGE'));
        return null;
      }
      useAlert(
        usableAsIs
          ? t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED_USING_ORIGINAL')
          : t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED')
      );
      return usableAsIs ? file : null;
    }
  } finally {
    release();
  }
};
