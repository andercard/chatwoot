import { getMaxUploadSizeByChannel } from '@chatwoot/utils';
import { DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE } from 'shared/helpers/FileHelper';
import { INBOX_TYPES } from 'dashboard/helper/inbox';

export const WHATSAPP_VIDEO_STANDARD_MAX_SIDE = 1280;
export const WHATSAPP_VIDEO_HD_MAX_SIDE = 1920;

const BYTES_PER_MB = 1024 * 1024;
const SAFETY_MARGIN = 0.9;
const OPTIMIZABLE_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/3gpp',
  'video/webm',
];
const NATIVE_CONTAINER_MIMES = ['video/mp4', 'video/3gpp'];
const SAFE_AVC_PROFILES = ['baseline', 'main'];

export const isOptimizableVideoMime = mime => OPTIMIZABLE_MIMES.includes(mime);

// Ladders go from the highest to the lowest step.
const WHATSAPP_STANDARD_LADDER = [
  { maxSide: 1280, maxVideoBitrate: 2000000, audioBitrate: 96000 },
  { maxSide: 960, maxVideoBitrate: 1200000, audioBitrate: 64000 },
  { maxSide: 640, maxVideoBitrate: 700000, audioBitrate: 64000 },
  { maxSide: 480, maxVideoBitrate: 450000, audioBitrate: 48000 },
];

const WHATSAPP_HD_LADDER = [
  { maxSide: 1920, maxVideoBitrate: 5000000, audioBitrate: 128000 },
  { maxSide: 1920, maxVideoBitrate: 3500000, audioBitrate: 128000 },
  { maxSide: 1280, maxVideoBitrate: 2500000, audioBitrate: 96000 },
  ...WHATSAPP_STANDARD_LADDER,
];

export const getVideoOptimizationPolicy = ({
  inbox,
  mime,
  installationLimit,
}) => {
  if (inbox?.channel_type !== INBOX_TYPES.WHATSAPP) return null;
  if (!isOptimizableVideoMime(mime)) return null;

  const channelLimit = getMaxUploadSizeByChannel({
    channelType: inbox.channel_type,
    medium: inbox.medium,
    mime,
  });
  if (channelLimit === DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE) return null;
  if (channelLimit >= installationLimit) return null;

  const limitBytes = channelLimit * BYTES_PER_MB;

  return {
    limitBytes,
    maxBytes: limitBytes * SAFETY_MARGIN,
    supportsHd: true,
    standardMaxSide: WHATSAPP_VIDEO_STANDARD_MAX_SIDE,
    hdMaxSide: WHATSAPP_VIDEO_HD_MAX_SIDE,
    standardLadder: WHATSAPP_STANDARD_LADDER,
    hdLadder: WHATSAPP_HD_LADDER,
  };
};

export const getVideoLadder = (policy, profile) =>
  profile === 'hd' ? policy.hdLadder : policy.standardLadder;

const getProfileMaxSide = (policy, profile) =>
  profile === 'hd' ? policy.hdMaxSide : policy.standardMaxSide;

// WhatsApp plays the original as is only for MP4 or 3GP, H.264 Baseline or Main, and AAC audio.
// High profile may carry B-frames, which we can't detect.
export const videoNeedsCodecFix = (probe, { mime }) => {
  if (!NATIVE_CONTAINER_MIMES.includes(mime)) return true;
  if (probe.videoCodec !== 'avc') return true;
  if (!SAFE_AVC_PROFILES.includes(probe.avcProfile)) return true;
  return probe.hasAudio && probe.audioCodec !== 'aac';
};

export const videoNeedsOptimization = (
  policy,
  profile,
  probe,
  { size, mime }
) => {
  if (size > policy.limitBytes) return true;
  if (videoNeedsCodecFix(probe, { mime })) return true;
  return probe.longestSide > getProfileMaxSide(policy, profile);
};
