import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { checkFileSizeLimit } from 'shared/helpers/FileHelper';
import { getMaxUploadSizeByChannel } from '@chatwoot/utils';
import { DirectUpload } from 'activestorage';
import { setDirectUploadAuthHeaders } from 'dashboard/helper/directUploadsHelper';
import {
  DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE,
  resolveMaximumFileUploadSize,
} from 'shared/helpers/FileHelper';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { isOptimizableImageMime } from 'dashboard/helper/imageOptimizationPolicy';
import { isOptimizableVideoMime } from 'dashboard/helper/videoOptimizationPolicy';
import { prepareImage, prepareVideo } from 'dashboard/helper/mediaPreparation';

const PERCENT = 100;

export default {
  data() {
    // Composer contexts with an image or video being optimized or a file being uploaded
    return {
      optimizingImages: [],
      optimizingVideos: [],
      uploadingFiles: [],
      videoOptimizationProgress: 0,
      videoOptimizationController: null,
    };
  },
  beforeUnmount() {
    this.videoOptimizationController?.abort();
  },
  computed: {
    isOptimizingImage() {
      return this.optimizingImages.some(this.isSameComposerContext);
    },
    isOptimizingVideo() {
      return this.optimizingVideos.some(this.isSameComposerContext);
    },
    videoOptimizationPercent() {
      return Math.round(this.videoOptimizationProgress * PERCENT);
    },
    isUploadingFile() {
      return this.uploadingFiles.some(this.isSameComposerContext);
    },
    ...mapGetters({
      accountId: 'getCurrentAccountId',
    }),
    installationLimit() {
      return resolveMaximumFileUploadSize(
        this.globalConfig.maximumFileUploadSize
      );
    },
  },

  methods: {
    maxSizeFor(mime) {
      // Use default/installation limit for private notes
      if (this.isOnPrivateNote) {
        return this.installationLimit;
      }

      const channelType = this.inbox?.channel_type;

      if (!channelType || channelType === INBOX_TYPES.WEB) {
        return this.installationLimit;
      }

      const channelLimit = getMaxUploadSizeByChannel({
        channelType,
        medium: this.inbox?.medium, // e.g. 'sms' | 'whatsapp'
        mime, // e.g. 'image/png'
      });

      if (channelLimit === DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE) {
        return this.installationLimit;
      }

      return Math.min(channelLimit, this.installationLimit);
    },
    alertOverLimit(maxSizeMB) {
      useAlert(
        this.$t('CONVERSATION.FILE_SIZE_LIMIT', {
          MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE: maxSizeMB,
        })
      );
    },
    prepareImageForUpload(file, profile = 'standard') {
      if (this.isOnPrivateNote) return file;

      return prepareImage(file, {
        profile,
        inbox: this.inbox,
        installationLimit: this.installationLimit,
        t: (...args) => this.$t(...args),
        track: () => this.trackOptimization('optimizingImages'),
      });
    },

    prepareVideoForUpload(file, profile = 'standard') {
      if (this.isOnPrivateNote) return file;

      const controller = new AbortController();
      return prepareVideo(file, {
        profile,
        inbox: this.inbox,
        installationLimit: this.installationLimit,
        t: (...args) => this.$t(...args),
        signal: controller.signal,
        onProgress: progress => {
          this.videoOptimizationProgress = progress;
        },
        track: () => {
          this.videoOptimizationProgress = 0;
          this.videoOptimizationController = controller;
          return this.trackOptimization('optimizingVideos');
        },
      });
    },

    prepareMediaForUpload(file, profile = 'standard') {
      const mime = file.file?.type || file.type;
      if (isOptimizableImageMime(mime)) {
        return this.prepareImageForUpload(file, profile);
      }
      if (isOptimizableVideoMime(mime)) {
        return this.prepareVideoForUpload(file, profile);
      }
      return file;
    },

    // Marks the current composer context as optimizing and returns the function that clears it
    trackOptimization(list) {
      const context = this.getComposerContext();
      this[list].push(context);
      return () => this.untrack(list, context);
    },

    async prepareVideoForUpload(file, profile = 'standard') {
      const mime = file.file?.type || file.type;
      if (this.isOnPrivateNote) return file;

      const policy = getVideoOptimizationPolicy({
        inbox: this.inbox,
        mime,
        installationLimit: this.installationLimit,
      });
      if (!policy) return file;

      const native = file.file || file;
      const { size } = native;
      const fits = size <= policy.limitBytes;
      const optimizing = this.getComposerContext();
      const controller = new AbortController();
      this.optimizingVideos.push(optimizing);
      this.videoOptimizationProgress = 0;
      this.videoOptimizationController = controller;
      let probe;
      try {
        try {
          probe = await probeVideo(native);
        } catch (error) {
          useAlert(
            fits
              ? this.$t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED_USING_ORIGINAL')
              : this.$t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED')
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
              ? this.$t(
                  'CONVERSATION.VIDEO_OPTIMIZATION.UNSUPPORTED_USING_ORIGINAL'
                )
              : this.$t('CONVERSATION.VIDEO_OPTIMIZATION.UNSUPPORTED')
          );
          return usableAsIs ? file : null;
        }

        try {
          const optimized = await optimizeVideo(native, {
            maxBytes: policy.maxBytes,
            ladder: getVideoLadder(policy, profile),
            signal: controller.signal,
            onProgress: progress => {
              this.videoOptimizationProgress = progress;
            },
          });
          return {
            ...file,
            file: optimized.file,
            name: optimized.file.name,
            type: optimized.file.type,
            size: optimized.file.size,
            originalFile: file.originalFile || file,
          };
        } catch (error) {
          const code =
            error instanceof VideoOptimizationError
              ? error.code
              : VIDEO_OPTIMIZATION_ERRORS.DECODE_FAILED;
          if (code === VIDEO_OPTIMIZATION_ERRORS.CANCELED) return null;
          if (code === VIDEO_OPTIMIZATION_ERRORS.TOO_LARGE) {
            useAlert(this.$t('CONVERSATION.VIDEO_OPTIMIZATION.TOO_LARGE'));
            return null;
          }
          useAlert(
            usableAsIs
              ? this.$t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED_USING_ORIGINAL')
              : this.$t('CONVERSATION.VIDEO_OPTIMIZATION.FAILED')
          );
          return usableAsIs ? file : null;
        }
      } finally {
        this.untrack('optimizingVideos', optimizing);
      }
    },

    prepareMediaForUpload(file, profile = 'standard') {
      const mime = file.file?.type || file.type;
      if (isOptimizableImageMime(mime)) {
        return this.prepareImageForUpload(file, profile);
      }
      if (isOptimizableVideoMime(mime)) {
        return this.prepareVideoForUpload(file, profile);
      }
      return file;
    },

    untrack(list, context) {
      const index = this[list].indexOf(context);
      if (index !== -1) this[list].splice(index, 1);
    },

    // The prepared file belongs to the conversation and reply mode it was picked in
    getComposerContext() {
      return {
        chatId: this.currentChat?.id,
        isOnPrivateNote: this.isOnPrivateNote,
      };
    },
    isSameComposerContext(context) {
      const current = this.getComposerContext();
      return (
        current.chatId === context.chatId &&
        current.isOnPrivateNote === context.isOnPrivateNote
      );
    },

    // `@input-file` also passes the previous file as a second argument, so only a literal true skips
    async onFileUpload(file, options) {
      if (!file) return;
      const skipPreparation = options?.skipPreparation === true;

      const context = this.getComposerContext();
      // Keeps Send disabled until the file is attached, including the direct upload
      this.uploadingFiles.push(context);
      try {
        const prepared = skipPreparation
          ? file
          : await this.prepareMediaForUpload(file);
        // The agent may have switched conversation or reply mode while it was prepared
        if (!prepared || !this.isSameComposerContext(context)) return;

        if (this.globalConfig.directUploadsEnabled) {
          await this.onDirectFileUpload(prepared);
        } else {
          await this.onIndirectFileUpload(prepared);
        }
      } finally {
        this.untrack('uploadingFiles', context);
      }
    },

    uploadDirectly(file) {
      const upload = new DirectUpload(
        file.file,
        `/api/v1/accounts/${this.accountId}/conversations/${this.currentChat.id}/direct_uploads`,
        {
          directUploadWillCreateBlobWithXHR: xhr => {
            setDirectUploadAuthHeaders(xhr);
          },
        }
      );

      return new Promise((resolve, reject) => {
        upload.create((error, blob) => {
          if (error) {
            reject(error);
          } else {
            resolve(blob);
          }
        });
      });
    },

    onDirectFileUpload(file) {
      if (!file) return undefined;

      const mime = file.file?.type || file.type;
      const maxSizeMB = this.maxSizeFor(mime);

      if (!checkFileSizeLimit(file, maxSizeMB)) {
        this.alertOverLimit(maxSizeMB);
        return undefined;
      }

      const context = this.getComposerContext();
      return this.uploadDirectly(file).then(
        blob => {
          if (!this.isSameComposerContext(context)) return undefined;
          return this.attachFile({ file, blob });
        },
        error => useAlert(error)
      );
    },

    onIndirectFileUpload(file) {
      if (!file) return undefined;

      const mime = file.file?.type || file.type;
      const maxSizeMB = this.maxSizeFor(mime);

      if (!checkFileSizeLimit(file, maxSizeMB)) {
        this.alertOverLimit(maxSizeMB);
        return undefined;
      }

      return this.attachFile({ file });
    },
  },
};
