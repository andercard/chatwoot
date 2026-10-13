<script>
import { ref } from 'vue';
import { vOnClickOutside } from '@vueuse/components';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import FileUpload from 'vue-upload-component';
import * as ActiveStorage from 'activestorage';
import inboxMixin from 'shared/mixins/inboxMixin';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { getAllowedFileTypesByChannel } from '@chatwoot/utils';
import VideoCallButton from '../VideoCallButton.vue';
import RequestContactInfoButton from '../RequestContactInfoButton.vue';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { mapGetters } from 'vuex';
import NextButton from 'dashboard/components-next/button/Button.vue';

export default {
  name: 'ReplyBottomPanel',
  components: {
    NextButton,
    FileUpload,
    VideoCallButton,
    RequestContactInfoButton,
  },
  directives: { OnClickOutside: vOnClickOutside },
  mixins: [inboxMixin],
  props: {
    isNote: {
      type: Boolean,
      default: false,
    },
    onSend: {
      type: Function,
      default: () => {},
    },
    sendButtonText: {
      type: String,
      default: '',
    },
    recordingAudioDurationText: {
      type: String,
      default: '00:00',
    },
    // inbox prop is used in /mixins/inboxMixin,
    // remove this props when refactoring to composable if not needed
    // eslint-disable-next-line vue/no-unused-properties
    inbox: {
      type: Object,
      default: () => ({}),
    },
    showFileUpload: {
      type: Boolean,
      default: false,
    },
    showAudioRecorder: {
      type: Boolean,
      default: false,
    },
    onFileUpload: {
      type: Function,
      default: () => {},
    },
    toggleEmojiPicker: {
      type: Function,
      default: () => {},
    },
    toggleAudioRecorder: {
      type: Function,
      default: () => {},
    },
    toggleAudioRecorderPlayPause: {
      type: Function,
      default: () => {},
    },
    isRecordingAudio: {
      type: Boolean,
      default: false,
    },
    recordingAudioState: {
      type: String,
      default: '',
    },
    isSendDisabled: {
      type: Boolean,
      default: false,
    },
    isOnPrivateNote: {
      type: Boolean,
      default: false,
    },
    enableMultipleFileUpload: {
      type: Boolean,
      default: true,
    },
    enableWhatsAppTemplates: {
      type: Boolean,
      default: false,
    },
    enableContentTemplates: {
      type: Boolean,
      default: false,
    },
    enableMacros: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: Number,
      required: true,
    },
    // eslint-disable-next-line vue/no-unused-properties
    message: {
      type: String,
      default: '',
    },
    newConversationModalActive: {
      type: Boolean,
      default: false,
    },
    portalSlug: {
      type: String,
      required: true,
    },
    conversationType: {
      type: String,
      default: '',
    },
    showQuotedReplyToggle: {
      type: Boolean,
      default: false,
    },
    quotedReplyEnabled: {
      type: Boolean,
      default: false,
    },
    isEditorDisabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'toggleInsertArticle',
    'selectWhatsappTemplate',
    'selectContentTemplate',
    'toggleQuotedReply',
    'requestContactInfoTemplate',
    'openMacros',
  ],
  setup(props) {
    const { setSignatureFlagForInbox, fetchSignatureFlagFromUISettings } =
      useUISettings();

    const uploadRef = ref(false);
    const showMobileMenu = ref(false);
    const mobileMenuToggleRef = ref(null);
    // Same label the desktop tooltip uses
    const contentTemplatesLabel = 'Content Templates';

    const keyboardEvents = {
      '$mod+Alt+KeyA': {
        action: () => {
          // Skip if editor is disabled (e.g., WhatsApp 24-hour window expired)
          if (props.isEditorDisabled) return;

          // TODO: This is really hacky, we need to replace the file picker component with
          // a custom one, where the logic and the component markup is isolated.
          // Once we have the custom component, we can remove the hacky logic below.

          const uploadTriggerButton = document.querySelector(
            '#conversationAttachment'
          );
          if (uploadTriggerButton) uploadTriggerButton.click();
        },
        allowOnFocusedInput: true,
      },
    };

    useKeyboardEvents(keyboardEvents);

    return {
      setSignatureFlagForInbox,
      fetchSignatureFlagFromUISettings,
      uploadRef,
      showMobileMenu,
      mobileMenuToggleRef,
      contentTemplatesLabel,
    };
  },
  computed: {
    ...mapGetters({
      accountId: 'getCurrentAccountId',
      isFeatureEnabledonAccount: 'accounts/isFeatureEnabledonAccount',
      uiFlags: 'integrations/getUIFlags',
    }),
    wrapClass() {
      return {
        'is-note-mode': this.isNote,
      };
    },
    showAttachButton() {
      if (this.isEditorDisabled) return false;
      return this.showFileUpload || this.isNote;
    },
    showMacrosRow() {
      return !this.isOnPrivateNote && this.enableMacros;
    },
    // Rows of the phone "+" menu: what the desktop row shows as icon buttons
    mobileMenuItems() {
      const photosAndFiles = [
        {
          key: 'photos',
          icon: 'i-lucide-image',
          label: this.$t('CONVERSATION.REPLYBOX.MOBILE_MENU.PHOTOS'),
          action: () => this.pickFile('mobilePhotosInput'),
        },
        {
          key: 'camera',
          icon: 'i-lucide-camera',
          label: this.$t('CONVERSATION.REPLYBOX.MOBILE_MENU.CAMERA'),
          action: () => this.pickFile('mobileCameraInput'),
        },
        {
          key: 'attach',
          icon: 'i-lucide-paperclip',
          label: this.$t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON'),
          action: () => this.pickFile('conversationAttachment'),
        },
      ].map(item => ({ ...item, show: this.showAttachButton }));

      return [
        ...photosAndFiles,
        {
          key: 'audio',
          show: this.showAudioRecorderButton,
          icon: this.isRecordingAudio
            ? 'i-ph-microphone-slash'
            : 'i-ph-microphone',
          label: this.$t('CONVERSATION.REPLYBOX.TIP_AUDIORECORDER_ICON'),
          action: () => this.toggleAudioRecorder(),
        },
        {
          key: 'macros',
          show: this.showMacrosRow,
          icon: 'i-lucide-zap',
          label: this.$t('CONVERSATION.REPLYBOX.MOBILE_MENU.MACROS'),
          action: () => this.$emit('openMacros'),
        },
        {
          key: 'article',
          show: !!this.enableInsertArticleInReply,
          icon: 'i-ph-article-ny-times',
          label: this.$t('HELP_CENTER.ARTICLE_SEARCH.OPEN_ARTICLE_SEARCH'),
          action: () => this.toggleInsertArticle(),
        },
        {
          key: 'signature',
          show: this.showMessageSignatureButton,
          icon: 'i-ph-signature',
          label: this.signatureToggleTooltip,
          checked: this.sendWithSignature,
          action: () => this.toggleMessageSignature(),
        },
        {
          key: 'quotedReply',
          show: this.showQuotedReplyToggle,
          icon: 'i-ph-quotes',
          label: this.quotedReplyToggleTooltip,
          checked: this.quotedReplyEnabled,
          action: () => this.$emit('toggleQuotedReply'),
        },
        {
          key: 'whatsappTemplates',
          show: this.enableWhatsAppTemplates,
          icon: 'i-ph-whatsapp-logo',
          label: this.$t('CONVERSATION.FOOTER.WHATSAPP_TEMPLATES'),
          action: () => this.$emit('selectWhatsappTemplate'),
        },
        {
          key: 'contentTemplates',
          show: this.enableContentTemplates,
          icon: 'i-ph-whatsapp-logo',
          label: this.contentTemplatesLabel,
          action: () => this.$emit('selectContentTemplate'),
        },
      ].filter(item => item.show);
    },
    showMobileMenuButton() {
      return this.mobileMenuItems.length > 0;
    },
    showAudioRecorderButton() {
      if (this.isEditorDisabled) return false;
      if (this.isALineChannel || this.isATiktokChannel) {
        return false;
      }
      // Disable audio recorder for safari browser as recording is not supported
      // const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(
      //   navigator.userAgent
      // );

      return (
        this.isFeatureEnabledonAccount(
          this.accountId,
          FEATURE_FLAGS.VOICE_RECORDER
        ) && this.showAudioRecorder
        // !isSafari
      );
    },
    showAudioPlayStopButton() {
      if (this.isEditorDisabled) return false;
      return this.showAudioRecorder && this.isRecordingAudio;
    },
    isInstagramDM() {
      return this.conversationType === 'instagram_direct_message';
    },
    allowedFileTypes() {
      if (this.isOnPrivateNote) {
        return getAllowedFileTypesByChannel();
      }

      let channelType = this.channelType || this.inbox?.channel_type;
      if (this.isAnInstagramChannel || this.isInstagramDM) {
        channelType = INBOX_TYPES.INSTAGRAM;
      }

      return getAllowedFileTypesByChannel({
        channelType,
        medium: this.inbox?.medium,
      });
    },
    // Photos and camera only offer what the channel accepts, so iOS converts HEIC to JPEG
    photoFileTypes() {
      return this.allowedFileTypes
        .split(',')
        .map(type => type.trim())
        .filter(type => /^(image|video)\//.test(type))
        .join(',');
    },
    cameraFileTypes() {
      return this.photoFileTypes
        .split(',')
        .filter(type => type.startsWith('image/'))
        .join(',');
    },
    enableDragAndDrop() {
      return !this.newConversationModalActive;
    },
    audioRecorderPlayStopIcon() {
      switch (this.recordingAudioState) {
        // playing paused recording stopped inactive destroyed
        case 'playing':
          return 'i-ph-pause';
        case 'paused':
          return 'i-ph-play';
        case 'stopped':
          return 'i-ph-play';
        default:
          return 'i-ph-stop';
      }
    },
    showMessageSignatureButton() {
      if (this.isEditorDisabled) return false;
      return !this.isOnPrivateNote;
    },
    sendWithSignature() {
      // channelType is sourced from inboxMixin
      return this.fetchSignatureFlagFromUISettings(this.channelType);
    },
    signatureToggleTooltip() {
      return this.sendWithSignature
        ? this.$t('CONVERSATION.FOOTER.DISABLE_SIGN_TOOLTIP')
        : this.$t('CONVERSATION.FOOTER.ENABLE_SIGN_TOOLTIP');
    },
    enableInsertArticleInReply() {
      return this.portalSlug;
    },
    isFetchingAppIntegrations() {
      return this.uiFlags.isFetching;
    },
    quotedReplyToggleTooltip() {
      return this.quotedReplyEnabled
        ? this.$t('CONVERSATION.REPLYBOX.QUOTED_REPLY.DISABLE_TOOLTIP')
        : this.$t('CONVERSATION.REPLYBOX.QUOTED_REPLY.ENABLE_TOOLTIP');
    },
  },
  mounted() {
    ActiveStorage.start();
  },
  methods: {
    toggleMessageSignature() {
      this.setSignatureFlagForInbox(this.channelType, !this.sendWithSignature);
    },
    toggleInsertArticle() {
      this.$emit('toggleInsertArticle');
    },
    // The phone menu reuses the hidden file inputs, which open the native pickers
    pickFile(inputId) {
      document.getElementById(inputId)?.click();
    },
    runMobileMenuItem(item) {
      this.showMobileMenu = false;
      item.action();
    },
  },
};
</script>

<template>
  <div class="flex justify-between p-3 max-sm:contents" :class="wrapClass">
    <div class="flex gap-2 items-center max-sm:contents">
      <div
        v-if="showMobileMenuButton"
        class="relative sm:hidden max-sm:row-start-1 max-sm:col-start-1 max-sm:self-end max-sm:group-data-[expanded]/wrapper:row-start-2"
      >
        <NextButton
          ref="mobileMenuToggleRef"
          :icon="showMobileMenu ? 'i-lucide-x' : 'i-lucide-plus'"
          slate
          faded
          sm
          :aria-label="$t('CONVERSATION.REPLYBOX.MOBILE_MENU.OPEN')"
          @click="showMobileMenu = !showMobileMenu"
        />
        <ul
          v-if="showMobileMenu"
          v-on-click-outside="[
            () => (showMobileMenu = false),
            { ignore: [mobileMenuToggleRef] },
          ]"
          class="absolute bottom-full z-20 p-1 m-0 mb-2 w-64 list-none rounded-xl shadow-lg outline outline-1 start-0 bg-n-alpha-3 backdrop-blur-[100px] outline-n-container"
        >
          <li v-for="item in mobileMenuItems" :key="item.key">
            <button
              type="button"
              class="flex gap-3 items-center py-2.5 px-3 w-full text-start rounded-lg text-n-slate-12 hover:bg-n-alpha-2"
              :aria-pressed="item.checked"
              @click="runMobileMenuItem(item)"
            >
              <span :class="item.icon" class="size-5 text-n-slate-11" />
              <span class="flex-1">{{ item.label }}</span>
              <span
                v-if="item.checked"
                class="i-lucide-check size-4 text-n-slate-12"
              />
            </button>
          </li>
          <li v-if="!isOnPrivateNote" class="empty:hidden">
            <RequestContactInfoButton
              as-row
              @click="showMobileMenu = false"
              @request-template="$emit('requestContactInfoTemplate')"
            />
          </li>
        </ul>
        <template v-if="showAttachButton">
          <FileUpload
            class="hidden"
            input-id="mobilePhotosInput"
            :size="4096 * 4096"
            :accept="photoFileTypes"
            :multiple="enableMultipleFileUpload"
            :drop="false"
            :data="{
              direct_upload_url: '/rails/active_storage/direct_uploads',
              direct_upload: true,
            }"
            @input-file="onFileUpload"
          />
          <FileUpload
            class="hidden"
            input-id="mobileCameraInput"
            :size="4096 * 4096"
            :accept="cameraFileTypes"
            capture="environment"
            :drop="false"
            :data="{
              direct_upload_url: '/rails/active_storage/direct_uploads',
              direct_upload: true,
            }"
            @input-file="onFileUpload"
          />
        </template>
      </div>
      <NextButton
        v-if="!isEditorDisabled"
        v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_EMOJI_ICON')"
        class="max-sm:hidden"
        icon="i-ph-smiley-sticker"
        slate
        faded
        sm
        @click="toggleEmojiPicker"
      />
      <div v-if="showAttachButton" class="max-sm:hidden sm:contents">
        <FileUpload
          v-if="showAttachButton"
          ref="uploadRef"
          v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON')"
          input-id="conversationAttachment"
          :size="4096 * 4096"
          :accept="allowedFileTypes"
          :multiple="enableMultipleFileUpload"
          :drop="enableDragAndDrop"
          :drop-directory="false"
          :data="{
            direct_upload_url: '/rails/active_storage/direct_uploads',
            direct_upload: true,
          }"
          @input-file="onFileUpload"
        >
          <NextButton
            v-if="showAttachButton"
            v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON')"
            icon="i-ph-paperclip"
            slate
            faded
            sm
          />
        </FileUpload>
      </div>
      <NextButton
        v-if="showAudioRecorderButton"
        v-tooltip.top-end="$t('CONVERSATION.REPLYBOX.TIP_AUDIORECORDER_ICON')"
        class="max-sm:hidden"
        :icon="!isRecordingAudio ? 'i-ph-microphone' : 'i-ph-microphone-slash'"
        slate
        faded
        sm
        @click="toggleAudioRecorder"
      />
      <NextButton
        v-if="showAudioPlayStopButton"
        class="max-sm:col-start-2 max-sm:row-start-1 max-sm:self-end max-sm:group-data-[expanded]/wrapper:row-start-2"
        :icon="audioRecorderPlayStopIcon"
        slate
        faded
        sm
        :label="recordingAudioDurationText"
        @click="toggleAudioRecorderPlayPause"
      />
      <NextButton
        v-if="showMessageSignatureButton"
        v-tooltip.top-end="signatureToggleTooltip"
        class="max-sm:hidden"
        icon="i-ph-signature"
        slate
        faded
        sm
        @click="toggleMessageSignature"
      />
      <NextButton
        v-if="showQuotedReplyToggle"
        v-tooltip.top-end="quotedReplyToggleTooltip"
        class="max-sm:hidden"
        icon="i-ph-quotes"
        :variant="quotedReplyEnabled ? 'solid' : 'faded'"
        color="slate"
        sm
        :aria-pressed="quotedReplyEnabled"
        @click="$emit('toggleQuotedReply')"
      />
      <NextButton
        v-if="enableWhatsAppTemplates"
        v-tooltip.top-end="$t('CONVERSATION.FOOTER.WHATSAPP_TEMPLATES')"
        class="max-sm:hidden"
        icon="i-ph-whatsapp-logo"
        slate
        faded
        sm
        @click="$emit('selectWhatsappTemplate')"
      />
      <!-- Phone: contact request lives in the "+" menu -->
      <div class="contents max-sm:hidden">
        <RequestContactInfoButton
          v-if="!isOnPrivateNote"
          @request-template="$emit('requestContactInfoTemplate')"
        />
      </div>
      <NextButton
        v-if="enableContentTemplates"
        v-tooltip.top-end="'Content Templates'"
        class="max-sm:hidden"
        icon="i-ph-whatsapp-logo"
        slate
        faded
        sm
        @click="$emit('selectContentTemplate')"
      />
      <div class="contents max-sm:hidden">
        <VideoCallButton
          v-if="
            (isAWebWidgetInbox || isAPIInbox) &&
            !isOnPrivateNote &&
            !isEditorDisabled
          "
          :conversation-id="conversationId"
        />
      </div>
      <transition name="modal-fade">
        <div
          v-show="uploadRef && uploadRef.dropActive"
          class="flex fixed top-0 right-0 bottom-0 left-0 z-20 flex-col gap-2 justify-center items-center w-full h-full text-n-slate-12 bg-modal-backdrop-light dark:bg-modal-backdrop-dark"
        >
          <fluent-icon icon="cloud-backup" size="40" />
          <h4 class="text-2xl break-words text-n-slate-12">
            {{ $t('CONVERSATION.REPLYBOX.DRAG_DROP') }}
          </h4>
        </div>
      </transition>
      <NextButton
        v-if="enableInsertArticleInReply"
        v-tooltip.top-end="$t('HELP_CENTER.ARTICLE_SEARCH.OPEN_ARTICLE_SEARCH')"
        class="max-sm:hidden"
        icon="i-ph-article-ny-times"
        slate
        faded
        sm
        @click="toggleInsertArticle"
      />
    </div>
    <div class="flex max-sm:contents">
      <NextButton
        :label="sendButtonText"
        type="submit"
        sm
        :color="isNote ? 'amber' : 'blue'"
        :disabled="isSendDisabled"
        class="flex-shrink-0 max-sm:hidden"
        @click="onSend"
      />
      <NextButton
        :aria-label="sendButtonText"
        icon="i-lucide-arrow-up"
        type="submit"
        :color="isNote ? 'amber' : 'blue'"
        :disabled="isSendDisabled"
        class="flex-shrink-0 !rounded-full sm:hidden max-sm:row-start-1 max-sm:col-start-4 max-sm:self-end max-sm:group-data-[expanded]/wrapper:row-start-2"
        @click="onSend"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.file-uploads) {
  label {
    @apply cursor-pointer;
  }

  &:hover button {
    @apply enabled:bg-n-slate-9/20;
  }
}
</style>
