export const FILE_STATUS = {
  OPTIMIZING: 'optimizing',
  UPLOADING: 'uploading',
  READY: 'ready',
  ERROR: 'error',
};

export const FILE_KIND = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
};

// Videos in other containers are converted to MP4 before uploading
export const MIME_KINDS = {
  'image/jpeg': FILE_KIND.IMAGE,
  'image/png': FILE_KIND.IMAGE,
  'video/mp4': FILE_KIND.VIDEO,
  'video/quicktime': FILE_KIND.VIDEO,
  'video/webm': FILE_KIND.VIDEO,
  'video/3gpp': FILE_KIND.VIDEO,
  'application/pdf': FILE_KIND.DOCUMENT,
};

export const ACCEPTED_FILE_TYPES = Object.keys(MIME_KINDS).join(',');

// The only types the server accepts once the file is prepared
export const UPLOADABLE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/pdf',
];

export const KIND_ICONS = {
  [FILE_KIND.IMAGE]: 'i-lucide-image',
  [FILE_KIND.VIDEO]: 'i-lucide-video',
  [FILE_KIND.DOCUMENT]: 'i-lucide-file-text',
};

const PERCENT = 100;
export const toPercent = fraction => Math.round(fraction * PERCENT);
