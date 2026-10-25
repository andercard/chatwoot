<script>
import { defineAsyncComponent, getCurrentInstance, useTemplateRef } from 'vue';
import { mapGetters } from 'vuex';
import { useAlert } from 'dashboard/composables';
import { useUISettings } from 'dashboard/composables/useUISettings';
import { useTrack } from 'dashboard/composables';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

import ReplyToMessage from './ReplyToMessage.vue';
import AttachmentPreview from 'dashboard/components/widgets/AttachmentsPreview.vue';
import ReplyTopPanel from 'dashboard/components/widgets/WootWriter/ReplyTopPanel.vue';
import ReplyEmailHead from './ReplyEmailHead.vue';
import ReplyBottomPanel from 'dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue';
import CopilotReplyBottomPanel from 'dashboard/components/widgets/WootWriter/CopilotReplyBottomPanel.vue';
import ArticleSearchPopover from 'dashboard/routes/dashboard/helpcenter/components/ArticleSearch/SearchPopover.vue';
import CopilotEditorSection from './CopilotEditorSection.vue';
import MessageSignatureMissingAlert from './MessageSignatureMissingAlert.vue';
import ReplyBoxBanner from './ReplyBoxBanner.vue';
import QuotedEmailPreview from './QuotedEmailPreview.vue';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import WootMessageEditor from 'dashboard/components/widgets/WootWriter/Editor.vue';
import AudioRecorder from 'dashboard/components/widgets/WootWriter/AudioRecorder.vue';
import { AUDIO_FORMATS } from 'shared/constants/messages';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { CMD_AI_ASSIST } from 'dashboard/helper/commandbar/events';
import { getUndefinedVariablesInMessage } from '@chatwoot/utils';
import WhatsappTemplates from './WhatsappTemplates/Modal.vue';
import WhatsappCatalogModal from './WhatsappCatalog/Modal.vue';
import LocationPicker from 'dashboard/components-next/whatsapp-location/LocationPicker.vue';
import ContentTemplates from './ContentTemplates/ContentTemplatesModal.vue';
import { MESSAGE_MAX_LENGTH } from 'shared/helpers/MessageTypeHelper';
import { isComposing } from 'shared/helpers/KeyboardHelpers';
import inboxMixin, { INBOX_FEATURES } from 'shared/mixins/inboxMixin';
import { trimContent, debounce, getRecipients } from '@chatwoot/utils';
import wootConstants from 'dashboard/constants/globals';
import {
  extractQuotedEmailText,
  buildQuotedEmailHeader,
  appendQuotedTextToMessage,
} from 'dashboard/helper/quotedEmailHelper';
import {
  CONVERSATION_EVENTS,
  CAPTAIN_EVENTS,
} from '../../../helper/AnalyticsHelper/events';
import fileUploadMixin from 'dashboard/mixins/fileUploadMixin';
import {
  getImageOptimizationPolicy,
  isOptimizableImageMime,
} from 'dashboard/helper/imageOptimizationPolicy';
import { getVideoOptimizationPolicy } from 'dashboard/helper/videoOptimizationPolicy';
import {
  waitForMessageDelivery,
  MESSAGE_DELIVERY_RESULTS,
} from 'dashboard/helper/messageDelivery';
import { getLongestSide } from 'shared/helpers/imageOptimizer';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import {
  appendSignature,
  removeSignature,
  getEffectiveChannelType,
  getReplyVariables,
} from 'dashboard/helper/editorHelper';
import { useCopilotReply } from 'dashboard/composables/useCopilotReply';
import { useMacroExecution } from 'dashboard/composables/useMacroExecution';
import ConversationResolveAttributesModal from 'dashboard/components-next/ConversationWorkflow/ConversationResolveAttributesModal.vue';
import { useKbd } from 'dashboard/composables/utils/useKbd';
import { isFileTypeAllowedForChannel } from 'shared/helpers/FileHelper';
import { isAIAssigneeType } from 'dashboard/helper/agentHelper';
import { getLastMessage } from 'dashboard/helper/conversationHelper';
import { CONTENT_TYPES } from 'dashboard/components-next/message/constants';

import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { LocalStorage } from 'shared/helpers/localStorage';
import { emitter } from 'shared/helpers/mitt';
// On a phone the keyboard must only open when the agent taps the input
const isPhoneViewport = () =>
  !!window.matchMedia?.('(max-width: 639px)').matches;

// [@Name](mention://user/1/Name) → captured group is the visible "@Name"
const MENTION_LINK_REGEX =
  /\[(@[^\]]+)\]\(mention:\/\/(?:user|team)\/\d+\/[^)]*\)/g;

import { prefetchCatalog } from 'dashboard/helper/whatsappCatalogCache';
const EmojiIconPicker = defineAsyncComponent(
  () =>
    import('dashboard/components-next/emoji-icon-picker/EmojiIconPicker.vue')
);

export default {
  components: {
    ArticleSearchPopover,
    AttachmentPreview,
    AudioRecorder,
    ReplyBoxBanner,
    EmojiIconPicker,
    MessageSignatureMissingAlert,
    ReplyBottomPanel,
    ReplyEmailHead,
    ReplyToMessage,
    ReplyTopPanel,
    Spinner,
    ContentTemplates,
    WhatsappTemplates,
    WhatsappCatalogModal,
    LocationPicker,
    WootMessageEditor,
    QuotedEmailPreview,
    CopilotEditorSection,
    CopilotReplyBottomPanel,
    ConversationResolveAttributesModal,
  },
  mixins: [inboxMixin, fileUploadMixin],
  emits: ['toggleEditorSize'],
  setup() {
    const {
      uiSettings,
      isEditorHotKeyEnabled,
      fetchSignatureFlagFromUISettings,
    } = useUISettings();

    const messageEditor = useTemplateRef('messageEditor');
    const copilot = useCopilotReply();
    const macroExecution = useMacroExecution();
    const shortcutKey = useKbd(['$mod', '+', 'enter']);

    // Options API state and methods live on the instance proxy
    const { proxy } = getCurrentInstance();
    useKeyboardEvents({
      Escape: {
        action: () => proxy.hideEmojiPicker(),
        allowOnFocusedInput: true,
      },
      '$mod+KeyK': {
        action: e => {
          e.preventDefault();
          const ninja = document.querySelector('ninja-keys');
          ninja.open();
        },
        allowOnFocusedInput: true,
      },
      Enter: {
        action: e => {
          if (isComposing(e)) return;
          if (proxy.isAValidEvent('enter')) {
            proxy.onSendReply();
            e.preventDefault();
          }
        },
        allowOnFocusedInput: true,
      },
      '$mod+Enter': {
        action: e => {
          if (isComposing(e)) return;
          if (copilot.isActive.value && proxy.isFocused) {
            proxy.onSubmitCopilotReply();
          } else if (proxy.isAValidEvent('cmd_enter')) {
            proxy.onSendReply();
          }
        },
        allowOnFocusedInput: true,
      },
      '$mod+KeyZ': {
        action: e => {
          // The editor prevents default only when its own history undid a
          // step; inputs keep their native undo. Shift means redo.
          if (e.defaultPrevented || e.shiftKey) return;
          if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
          // Only act inside the composer, or with nothing focused (right
          // after clicking remove); never hijack another editor's undo.
          const inComposer =
            e.target instanceof Element && !!e.target.closest('.reply-box');
          if (!inComposer && e.target !== document.body) return;
          if (proxy.restoreQuotedEmail()) e.preventDefault();
        },
        allowOnFocusedInput: true,
      },
    });

    return {
      uiSettings,
      isEditorHotKeyEnabled,
      fetchSignatureFlagFromUISettings,
      messageEditor,
      copilot,
      shortcutKey,
      macroExecution,
    };
  },
  data() {
    return {
      message: '',
      inReplyTo: {},
      isFocused: false,
      showEmojiPicker: false,
      attachedFiles: [],
      isRecordingAudio: false,
      sendAfterRecording: false,
      replyType: REPLY_EDITOR_MODES.REPLY,
      focusEditorOnMount: !isPhoneViewport(),
      carryOnNextModeSwitch: false,
      draftConversationId: null,
      draftReplyMode: null,
      bccEmails: '',
      ccEmails: '',
      toEmails: '',
      subject: '',
      doAutoSaveDraft: () => {},
      showWhatsAppTemplatesModal: false,
      showWhatsappCatalogModal: false,
      showLocationPicker: false,
      requestContactInfoTemplatesOnly: false,
      showContentTemplatesModal: false,
      updateEditorSelectionWith: '',
      undefinedVariableMessage: '',
      showMentions: false,
      showUserMentions: false,
      showCannedMenu: false,
      showVariablesMenu: false,
      showMacrosMenu: false,
      newConversationModalActive: false,
      showArticleSearchPopover: false,
      hasRecordedAudio: false,
      copilotAcceptedMessages: {},
      isQuoteRemoved: false,
    };
  },
  computed: {
    ...mapGetters({
      currentChat: 'getSelectedChat',
      messageSignature: 'getMessageSignature',
      currentUser: 'getCurrentUser',
      lastEmail: 'getLastEmailInSelectedChat',
      globalConfig: 'globalConfig/get',
      isMetaMessageSendingDisabled: 'globalConfig/isMetaMessageSendingDisabled',
      accountId: 'getCurrentAccountId',
      isFeatureEnabledonAccount: 'accounts/isFeatureEnabledonAccount',
    }),
    isMacrosEnabled() {
      return this.isFeatureEnabledonAccount(
        this.accountId,
        FEATURE_FLAGS.MACROS
      );
    },
    currentContact() {
      const senderId = this.currentChat?.meta?.sender?.id;
      if (!senderId) return {};
      return this.$store.getters['contacts/getContact'](senderId);
    },
    shouldShowReplyToMessage() {
      return (
        this.inReplyTo?.id &&
        !this.isPrivate &&
        this.inboxHasFeature(INBOX_FEATURES.REPLY_TO) &&
        !this.is360DialogWhatsAppChannel &&
        !this.copilot.isActive.value
      );
    },
    showWhatsappTemplates() {
      // We support templates for API channels if someone updates templates manually via API
      // That's why we don't explicitly check for channel type here
      const templates = this.$store.getters['inboxes/getWhatsAppTemplates'](
        this.inboxId
      );
      return !!(templates && templates.length) && !this.isPrivate;
    },
    showWhatsappCatalog() {
      return this.isAWhatsAppCloudChannel && !this.isPrivate;
    },
    showWhatsappLocation() {
      return (
        this.isAWhatsAppCloudChannel &&
        !this.isPrivate &&
        !!this.currentChat?.can_reply
      );
    },
    whatsappCatalogLink() {
      const digits = (this.inbox.phone_number || '').replace(/\D/g, '');
      return digits ? `https://wa.me/c/${digits}` : '';
    },
    catalogPrefetchInboxId() {
      return this.showWhatsappCatalog && this.inbox.id;
    },
    showContentTemplates() {
      return this.isATwilioWhatsAppChannel && !this.isPrivate;
    },
    isWithinMessagingWindow() {
      return !!(
        this.currentChat?.can_reply ||
        this.isAWhatsAppChannel ||
        this.isAPIInbox
      );
    },
    canSendPublicReply() {
      return (
        this.isWithinMessagingWindow &&
        !this.isAIOwnedPendingConversation &&
        !this.isInstagramReplyRestricted
      );
    },
    isVoiceCallConversation() {
      if (!this.currentChat.messages) return false;
      return (
        getLastMessage(this.currentChat)?.content_type ===
        CONTENT_TYPES.VOICE_CALL
      );
    },
    isInstagramReplyRestricted() {
      return this.isMetaMessageSendingDisabled && this.isAnInstagramChannel;
    },
    isPrivate() {
      return (
        !this.canSendPublicReply || this.replyType === REPLY_EDITOR_MODES.NOTE
      );
    },
    isOnPrivateNote() {
      if (this.isInstagramReplyRestricted) {
        return true;
      }

      return this.isAIOwnedPendingConversation
        ? this.isPrivate
        : this.replyType === REPLY_EDITOR_MODES.NOTE;
    },
    effectiveReplyMode() {
      return this.isOnPrivateNote
        ? REPLY_EDITOR_MODES.NOTE
        : REPLY_EDITOR_MODES.REPLY;
    },
    hasMeaningfulEditorContent() {
      const body = this.message || '';
      // Only strip the signature when it's actually being auto-appended.
      // If the toggle is off, the agent's text might happen to match their
      // saved signature and we'd incorrectly treat it as empty.
      const shouldStripSignature =
        !this.isPrivate && this.sendWithSignature && !!this.messageSignature;
      if (!shouldStripSignature) return !!body.trim();
      const stripped = removeSignature(
        body,
        this.messageSignature,
        getEffectiveChannelType(this.channelType, this.inbox?.medium || '')
      );
      return !!stripped.trim();
    },
    isAIOwnedPendingConversation() {
      return (
        this.currentChat?.status === wootConstants.STATUS_TYPE.PENDING &&
        isAIAssigneeType(this.currentChat?.meta?.assignee_type)
      );
    },
    inboxId() {
      return this.currentChat.inbox_id;
    },
    inbox() {
      return this.$store.getters['inboxes/getInbox'](this.inboxId);
    },
    messagePlaceHolder() {
      if (this.isEditorDisabled) {
        if (this.isAWhatsAppChannel) {
          return this.$t('CONVERSATION.FOOTER.MESSAGING_RESTRICTED_WHATSAPP');
        }
        if (this.isAPIInbox) {
          return this.$t('CONVERSATION.FOOTER.MESSAGING_RESTRICTED_API');
        }
        return this.$t('CONVERSATION.FOOTER.MESSAGING_RESTRICTED');
      }
      return this.isPrivate
        ? this.$t('CONVERSATION.FOOTER.PRIVATE_MSG_INPUT')
        : this.$t('CONVERSATION.FOOTER.MSG_INPUT');
    },
    isMessageLengthReachingThreshold() {
      return this.message.length > this.maxLength - 50;
    },
    charactersRemaining() {
      return this.maxLength - this.message.length;
    },
    // HD is only offered on channels whose policy has an HD tier (WhatsApp)
    supportsHdToggle() {
      if (this.isOnPrivateNote) return false;
      const policy = getImageOptimizationPolicy({
        inbox: this.inbox,
        mime: 'image/jpeg',
        installationLimit: this.installationLimit,
      });
      return !!policy?.supportsHd;
    },
    isProcessingAttachment() {
      return (
        this.isOptimizingImage ||
        this.isOptimizingVideo ||
        this.isUploadingFile ||
        this.attachedFiles.some(attachment => attachment.isOptimizing)
      );
    },
    isReplyButtonDisabled() {
      if (this.isEditorDisabled) return true;
      if (this.isATwitterInbox) return true;
      if (this.isProcessingAttachment) return true;
      if (this.hasAttachments || this.hasRecordedAudio) return false;

      return (
        this.isMessageEmpty ||
        this.message.length === 0 ||
        this.message.length > this.maxLength
      );
    },
    sender() {
      return {
        name: this.currentUser.name,
        thumbnail: this.currentUser.avatar_url,
      };
    },
    conversationType() {
      const { additional_attributes: additionalAttributes } = this.currentChat;
      const type = additionalAttributes ? additionalAttributes.type : '';
      return type || '';
    },
    maxLength() {
      if (this.isPrivate) {
        return MESSAGE_MAX_LENGTH.GENERAL;
      }
      if (this.isAFacebookInbox) {
        return MESSAGE_MAX_LENGTH.FACEBOOK;
      }
      if (this.isAnInstagramChannel) {
        return MESSAGE_MAX_LENGTH.INSTAGRAM;
      }
      if (this.isATelegramChannel) {
        return MESSAGE_MAX_LENGTH.TELEGRAM;
      }
      if (this.isATiktokChannel) {
        return MESSAGE_MAX_LENGTH.TIKTOK;
      }
      if (this.isATwilioWhatsAppChannel) {
        return MESSAGE_MAX_LENGTH.TWILIO_WHATSAPP;
      }
      if (this.isAWhatsAppCloudChannel) {
        return MESSAGE_MAX_LENGTH.WHATSAPP_CLOUD;
      }
      if (this.isASmsInbox) {
        return MESSAGE_MAX_LENGTH.TWILIO_SMS;
      }
      if (this.isAnEmailChannel) {
        return MESSAGE_MAX_LENGTH.EMAIL;
      }
      if (this.isATwilioSMSChannel) {
        return MESSAGE_MAX_LENGTH.TWILIO_SMS;
      }
      if (this.isAWhatsAppChannel) {
        return MESSAGE_MAX_LENGTH.WHATSAPP_CLOUD;
      }
      return MESSAGE_MAX_LENGTH.GENERAL;
    },
    showFileUpload() {
      const { image_send: imageSend } =
        this.currentChat?.additional_attributes?.tiktok_capabilities ?? {};
      const tiktokAttachmentSupported = imageSend ?? true;

      return (
        this.isAWebWidgetInbox ||
        this.isAFacebookInbox ||
        this.isAWhatsAppChannel ||
        this.isAPIInbox ||
        this.isAnEmailChannel ||
        this.isASmsInbox ||
        this.isATelegramChannel ||
        this.isALineChannel ||
        this.isAnInstagramChannel ||
        (this.isATiktokChannel && tiktokAttachmentSupported)
      );
    },
    replyButtonLabel() {
      let sendMessageText = this.$t('CONVERSATION.REPLYBOX.SEND');
      if (this.isPrivate) {
        sendMessageText = this.$t('CONVERSATION.REPLYBOX.CREATE');
      }
      const keyLabel = this.isEditorHotKeyEnabled('cmd_enter')
        ? `(${this.shortcutKey})`
        : '(↵)';
      return `${sendMessageText} ${keyLabel}`;
    },
    replyBoxClass() {
      return {
        'is-private': this.isPrivate,
        'is-focused': this.isFocused || this.hasAttachments,
      };
    },
    hasAttachments() {
      return this.attachedFiles.length;
    },
    showAudioRecorder() {
      return !this.isOnPrivateNote && this.showFileUpload;
    },
    showAudioRecorderEditor() {
      return this.showAudioRecorder && this.isRecordingAudio;
    },
    isOnExpandedLayout() {
      const {
        LAYOUT_TYPES: { CONDENSED },
      } = wootConstants;
      const { conversation_display_type: conversationDisplayType = CONDENSED } =
        this.uiSettings;
      return conversationDisplayType !== CONDENSED;
    },
    isMessageEmpty() {
      if (!this.message) {
        return true;
      }
      return !this.message.trim().replace(/\n/g, '').length;
    },
    showReplyHead() {
      return !this.isOnPrivateNote && this.isAnEmailChannel;
    },
    enableMultipleFileUpload() {
      return (
        this.isAnEmailChannel ||
        this.isAWebWidgetInbox ||
        this.isAPIInbox ||
        this.isAWhatsAppChannel ||
        this.isATelegramChannel
      );
    },
    isSignatureEnabledForInbox() {
      return !this.isPrivate && this.sendWithSignature;
    },
    isSignatureAvailable() {
      return !!this.messageSignature;
    },
    sendWithSignature() {
      return this.fetchSignatureFlagFromUISettings(this.channelType);
    },
    conversationId() {
      return this.currentChat.id;
    },
    conversationIdByRoute() {
      return this.conversationId;
    },
    editorStateId() {
      return `draft-${this.conversationIdByRoute}-${this.effectiveReplyMode}`;
    },
    audioRecordFormat() {
      if (this.isAWhatsAppCloudChannel) {
        return AUDIO_FORMATS.OGG;
      }
      if (this.isAWhatsAppChannel || this.isATelegramChannel) {
        return AUDIO_FORMATS.MP3;
      }
      if (this.isAPIInbox) {
        return AUDIO_FORMATS.MP3;
      }
      return AUDIO_FORMATS.WAV;
    },
    messageVariables() {
      return getReplyVariables({
        conversation: this.currentChat,
        contact: this.currentContact,
        inbox: this.inbox,
        user: this.currentUser,
      });
    },
    connectedPortalSlug() {
      const { help_center: portal = {} } = this.inbox;
      const { slug = '' } = portal;
      return slug;
    },
    lastEmailWithQuotedContent() {
      if (!this.isAnEmailChannel) {
        return null;
      }

      const lastEmail = this.lastEmail;
      if (!lastEmail || lastEmail.private) {
        return null;
      }

      return lastEmail;
    },
    quotedEmailText() {
      return extractQuotedEmailText(this.lastEmailWithQuotedContent);
    },
    quotedEmailHeader() {
      return buildQuotedEmailHeader(
        this.lastEmailWithQuotedContent,
        this.currentContact,
        this.inbox
      );
    },
    shouldIncludeQuotedEmail() {
      return (
        this.isAnEmailChannel &&
        !this.isOnPrivateNote &&
        !this.isQuoteRemoved &&
        !!this.quotedEmailText
      );
    },
    isDefaultEditorMode() {
      return !this.showAudioRecorderEditor && !this.copilot.isActive.value;
    },
    isEditorDisabled() {
      return (
        (this.isAWhatsAppChannel || this.isAPIInbox) &&
        !this.isOnPrivateNote &&
        !this.currentChat.can_reply
      );
    },
  },
  watch: {
    currentChat(conversation, oldConversation) {
      if (oldConversation && oldConversation.id !== conversation.id) {
        // Only update email fields when switching to a completely different conversation (by ID)
        // This prevents overwriting user input (e.g., CC/BCC fields) when performing actions
        // like self-assign or other updates that do not actually change the conversation context
        this.setCCAndToEmailsFromLastChat();
        this.subject = '';
        // Reset Copilot editor state (includes cancelling ongoing generation)
        this.copilot.reset();
        // Default to a note on calls so a reply is not sent as SMS by accident.
        // Only on open, so an agent who switches to reply keeps it.
        if (this.isVoiceCallConversation) {
          this.replyType = REPLY_EDITOR_MODES.NOTE;
        }
      }

      if (this.isInstagramReplyRestricted) {
        this.replyType = REPLY_EDITOR_MODES.NOTE;
        return;
      }

      if (this.isOnPrivateNote) {
        return;
      }

      this.replyType = this.isWithinMessagingWindow
        ? REPLY_EDITOR_MODES.REPLY
        : REPLY_EDITOR_MODES.NOTE;

      this.fetchAndSetReplyTo();
    },
    // When moving from one conversation to another, the store may not have the
    // list of all the messages. A fetch is subsequently made to get the messages.
    // This watcher handles two main cases:
    // 1. When switching conversations and messages are fetched/updated, ensures CC/BCC fields are set from the latest OUTGOING/INCOMING email (not activity/private messages).
    // 2. Fixes and issue where CC/BCC fields could be reset/lost after assignment/activity actions or message mutations that did not represent a true email context change.
    lastEmail: {
      handler(lastEmail) {
        if (!lastEmail) return;
        this.setCCAndToEmailsFromLastChat();
      },
      deep: true,
    },
    conversationIdByRoute(conversationId, oldConversationId) {
      if (conversationId !== oldConversationId) {
        this.switchDraftContext(conversationId, this.effectiveReplyMode);
        this.resetRecorderAndClearAttachments();
        this.isQuoteRemoved = false;
      }
    },
    message() {
      // Autosave the current message draft.
      this.doAutoSaveDraft();
    },
    showWhatsappTemplates(isAvailable) {
      if (!isAvailable) this.hideWhatsappTemplatesModal();
    },
    showWhatsappCatalog(isAvailable) {
      if (!isAvailable) this.showWhatsappCatalogModal = false;
    },
    showWhatsappLocation(isAvailable) {
      if (!isAvailable) this.showLocationPicker = false;
    },
    catalogPrefetchInboxId: {
      immediate: true,
      handler(inboxId) {
        if (inboxId) prefetchCatalog(inboxId);
      },
    },
    showContentTemplates(isAvailable) {
      if (!isAvailable) this.hideContentTemplatesModal();
    },
    effectiveReplyMode(updatedReplyType) {
      this.$store.dispatch('draftMessages/setReplyEditorMode', {
        mode: updatedReplyType,
      });
      this.switchDraftContext(this.conversationIdByRoute, updatedReplyType);
    },
  },

  mounted() {
    if (this.isInstagramReplyRestricted || this.isVoiceCallConversation) {
      this.replyType = REPLY_EDITOR_MODES.NOTE;
    }

    this.$store.dispatch('draftMessages/setReplyEditorMode', {
      mode: this.effectiveReplyMode,
    });
    this.switchDraftContext(
      this.conversationIdByRoute,
      this.effectiveReplyMode
    );
    // Bound directly rather than through useKeyboardEvents, because this has to
    // keep working even while the editor is focussed.
    document.addEventListener('paste', this.onPaste);
    this.setCCAndToEmailsFromLastChat();
    this.doAutoSaveDraft = debounce(
      () => {
        this.saveDraft(this.conversationIdByRoute, this.effectiveReplyMode);
      },
      500,
      true
    );

    this.fetchAndSetReplyTo();
    emitter.on(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, this.onReplyToMessage);

    // A hacky fix to solve the drag and drop
    // Is showing on top of new conversation modal drag and drop
    // TODO need to find a better solution
    emitter.on(
      BUS_EVENTS.NEW_CONVERSATION_MODAL,
      this.onNewConversationModalActive
    );
    emitter.on(CMD_AI_ASSIST, this.executeCopilotAction);
  },
  unmounted() {
    document.removeEventListener('paste', this.onPaste);
    emitter.off(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, this.onReplyToMessage);
    emitter.off(
      BUS_EVENTS.NEW_CONVERSATION_MODAL,
      this.onNewConversationModalActive
    );
    emitter.off(CMD_AI_ASSIST, this.executeCopilotAction);
  },
  methods: {
    openContactInfoTemplateModal() {
      this.requestContactInfoTemplatesOnly = true;
      this.showWhatsAppTemplatesModal = true;
    },
    getDraftKey(
      conversationId = this.conversationIdByRoute,
      replyType = this.effectiveReplyMode
    ) {
      return `draft-${conversationId}-${replyType}`;
    },
    getCopilotAcceptedMessage(replyType = this.effectiveReplyMode) {
      const key = this.getDraftKey(this.conversationIdByRoute, replyType);
      return this.copilotAcceptedMessages[key] || '';
    },
    setCopilotAcceptedMessage(message, replyType = this.effectiveReplyMode) {
      const key = this.getDraftKey(this.conversationIdByRoute, replyType);
      this.copilotAcceptedMessages[key] = trimContent(
        message || '',
        this.maxLength
      );
    },
    clearCopilotAcceptedMessage(replyType = this.effectiveReplyMode) {
      const key = this.getDraftKey(this.conversationIdByRoute, replyType);
      delete this.copilotAcceptedMessages[key];
    },
    handleInsert(article) {
      const { url, title } = article;
      // Removing empty lines from the title
      const lines = title.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim() !== '');
      const filteredMarkdown = nonEmptyLines.join(' ');
      emitter.emit(
        BUS_EVENTS.INSERT_INTO_RICH_EDITOR,
        `[${filteredMarkdown}](${url})`
      );

      useTrack(CONVERSATION_EVENTS.INSERT_ARTICLE_LINK);
    },
    removeQuotedEmail() {
      this.isQuoteRemoved = true;
    },
    restoreQuotedEmail() {
      if (!this.isQuoteRemoved) {
        return false;
      }
      this.isQuoteRemoved = false;
      return true;
    },
    getMessageWithQuotedEmailText(message) {
      if (!this.shouldIncludeQuotedEmail) {
        return message;
      }

      return appendQuotedTextToMessage(
        message,
        this.quotedEmailText,
        this.quotedEmailHeader
      );
    },
    resetRecorderAndClearAttachments() {
      // Reset audio recorder UI state
      this.resetAudioRecorderInput();
      // Reset attached files
      this.attachedFiles = [];
    },
    saveDraft(conversationId, replyType) {
      if (this.message || this.message === '') {
        const key = this.getDraftKey(conversationId, replyType);
        const draftToSave = trimContent(this.message || '', this.maxLength);

        this.$store.dispatch('draftMessages/set', {
          key,
          message: draftToSave,
        });
      }
    },
    setToDraft(conversationId, replyType) {
      this.saveDraft(conversationId, replyType);
      this.message = '';
    },
    switchDraftContext(conversationId, replyMode) {
      if (
        this.draftConversationId === conversationId &&
        this.draftReplyMode === replyMode
      ) {
        return;
      }

      // Only an explicit switch by the agent carries the text over; automatic
      // ones (a bot handing over the conversation) restore each mode's draft.
      const carryOver = this.carryOnNextModeSwitch;
      this.carryOnNextModeSwitch = false;
      if (
        carryOver &&
        this.draftConversationId === conversationId &&
        this.carryMessageToMode(replyMode)
      ) {
        return;
      }

      if (this.draftConversationId) {
        this.setToDraft(this.draftConversationId, this.draftReplyMode);
      }

      this.draftConversationId = conversationId;
      this.draftReplyMode = replyMode;
      this.getFromDraft();
    },
    // Switching between reply and private note keeps what the agent typed.
    // Returns false when there is nothing to carry, so the target mode's own
    // draft is loaded instead.
    carryMessageToMode(replyMode) {
      const channelType = getEffectiveChannelType(
        this.channelType,
        this.inbox?.medium || ''
      );
      let carried = this.message || '';
      if (this.messageSignature) {
        carried = removeSignature(carried, this.messageSignature, channelType);
      }
      if (!carried.trim()) return false;

      // Mentions only notify inside private notes; in a public reply they
      // would reach the customer as a raw mention link, so keep just the name.
      if (replyMode === REPLY_EDITOR_MODES.REPLY) {
        carried = carried.replace(MENTION_LINK_REGEX, '$1');
      }

      this.$store.dispatch('draftMessages/delete', {
        key: this.getDraftKey(this.draftConversationId, this.draftReplyMode),
      });
      this.draftReplyMode = replyMode;
      this.message = this.toggleSignatureForDraft(carried);
      return true;
    },
    getFromDraft() {
      if (this.conversationIdByRoute) {
        const key = this.getDraftKey();
        const messageFromStore =
          this.$store.getters['draftMessages/get'](key) || '';

        // ensure that the message has signature set based on the ui setting
        this.message = this.toggleSignatureForDraft(messageFromStore);
      }
    },
    toggleSignatureForDraft(message) {
      if (this.isPrivate) {
        return message;
      }

      // Even when editor is disabled (e.g. WhatsApp/API can't reply), we must
      // still normalize stale signatures out of drafts when signature is off.
      if (this.isEditorDisabled && this.sendWithSignature) {
        return message;
      }

      const effectiveChannelType = getEffectiveChannelType(
        this.channelType,
        this.inbox?.medium || ''
      );

      return this.sendWithSignature
        ? appendSignature(message, this.messageSignature, effectiveChannelType)
        : removeSignature(message, this.messageSignature, effectiveChannelType);
    },
    removeFromDraft() {
      if (this.conversationIdByRoute) {
        const key = this.getDraftKey();
        this.$store.dispatch('draftMessages/delete', { key });
      }
    },
    isAValidEvent(selectedKey) {
      return (
        !this.showUserMentions &&
        !this.showMentions &&
        !this.showCannedMenu &&
        !this.showVariablesMenu &&
        !this.showMacrosMenu &&
        this.isFocused &&
        this.isEditorHotKeyEnabled(selectedKey)
      );
    },
    onPaste(e) {
      // Don't handle paste if compose new conversation modal is open
      if (this.newConversationModalActive) return;

      // Don't handle paste if editor is disabled
      if (this.isEditorDisabled) return;
      if (!this.showFileUpload && !this.isOnPrivateNote) return;

      // Filter valid files (non-zero size)
      Array.from(e.clipboardData.files)
        .filter(file => file.size > 0)
        .filter(file => {
          const isAllowed = isFileTypeAllowedForChannel(file, {
            channelType: this.channelType || this.inbox?.channel_type,
            medium: this.inbox?.medium,
            conversationType: this.conversationType,
            isInstagramChannel: this.isAnInstagramChannel,
            isOnPrivateNote: this.isOnPrivateNote,
          });

          if (!isAllowed) {
            useAlert(
              this.$t('CONVERSATION.FILE_TYPE_NOT_SUPPORTED', {
                fileName: file.name,
              })
            );
          }

          return isAllowed;
        })
        .forEach(file => {
          const { name, type, size } = file;
          this.onFileUpload({ name, type, size, file });
        });
    },
    toggleUserMention(currentMentionState) {
      this.showUserMentions = currentMentionState;
    },
    toggleCannedMenu(value) {
      this.showCannedMenu = value;
    },
    toggleVariablesMenu(value) {
      this.showVariablesMenu = value;
    },
    toggleMacrosMenu(value) {
      this.showMacrosMenu = value;
    },
    onExecuteMacro(macro) {
      const pending = this.macroExecution.execute(macro, this.currentChat.id);
      if (pending) {
        this.$refs.resolveAttributesModal?.open(
          pending.missing,
          pending.customAttributes
        );
      }
    },
    openWhatsappCatalog() {
      this.showWhatsappCatalogModal = true;
    },
    openLocationPicker() {
      this.showLocationPicker = true;
    },
    insertWhatsappCatalogLink(link) {
      this.message = this.message ? `${this.message}\n${link}` : link;
    },
    onWhatsappCatalogSent() {
      this.message = '';
      this.removeFromDraft();
    },
    openWhatsappTemplateModal() {
      this.requestContactInfoTemplatesOnly = false;
      this.showWhatsAppTemplatesModal = true;
    },
    hideWhatsappTemplatesModal() {
      this.showWhatsAppTemplatesModal = false;
      this.requestContactInfoTemplatesOnly = false;
    },
    openContentTemplateModal() {
      this.showContentTemplatesModal = true;
    },
    hideContentTemplatesModal() {
      this.showContentTemplatesModal = false;
    },
    confirmOnSendReply() {
      if (this.isReplyButtonDisabled) {
        return;
      }
      if (!this.showMentions) {
        const copilotAcceptedMessage = this.getCopilotAcceptedMessage();
        const isOnWhatsApp =
          this.isATwilioWhatsAppChannel ||
          this.isAWhatsAppCloudChannel ||
          this.is360DialogWhatsAppChannel;
        // Instagram and TikTok do not support sending text and attachments in the same message.
        // For Instagram, combining them causes duplicate messages due to separate echo events per component.
        // For TikTok, the API rejects messages that mix text and media.
        // To handle both cases, text and attachments are always sent as separate messages.
        const isOnInstagram = this.isAnInstagramChannel;
        const isOnTiktok = this.isATiktokChannel;
        if ((isOnWhatsApp || isOnInstagram || isOnTiktok) && !this.isPrivate) {
          this.sendMessageAsMultipleMessages(
            this.message,
            copilotAcceptedMessage
          );
        } else {
          const messagePayload = this.getMessagePayload(this.message);
          this.sendMessage(
            messagePayload,
            this.message,
            copilotAcceptedMessage
          );
        }

        if (!this.isPrivate) {
          this.clearEmailField();
          this.isQuoteRemoved = false;
        }

        this.clearMessage();
        this.hideEmojiPicker();
      }
    },
    async sendMessageAsMultipleMessages(message, copilotAcceptedMessage = '') {
      const messages = this.getMultipleMessagesPayload(message);
      const lastIndex = messages.length - 1;
      // Each message waits until the provider accepted the previous one, so they reach the customer in order
      for (let index = 0; index < lastIndex; index += 1) {
        const messagePayload = messages[index];
        // eslint-disable-next-line no-await-in-loop
        const savedMessage = await this.sendMessage(
          messagePayload,
          messagePayload.message || '',
          copilotAcceptedMessage,
          true
        );
        if (!savedMessage) return;

        // eslint-disable-next-line no-await-in-loop
        const result = await waitForMessageDelivery(this.$store, {
          conversationId: messagePayload.conversationId,
          messageId: savedMessage.id,
        });
        if (result === MESSAGE_DELIVERY_RESULTS.FAILED) return;
      }
      const lastPayload = messages[lastIndex];
      if (lastPayload) {
        this.sendMessage(
          lastPayload,
          lastPayload.message || '',
          copilotAcceptedMessage
        );
      }
    },
    sendMessageAnalyticsData(
      isPrivate,
      { editorMessage = '', copilotAcceptedMessage = '' } = {}
    ) {
      const normalizeForComparison = message => {
        let normalizedMessage = message || '';

        if (this.sendWithSignature && this.messageSignature && !isPrivate) {
          const effectiveChannelType = getEffectiveChannelType(
            this.channelType,
            this.inbox?.medium || ''
          );
          normalizedMessage = removeSignature(
            normalizedMessage,
            this.messageSignature,
            effectiveChannelType
          );
        }

        return trimContent(normalizedMessage);
      };

      const normalizedAcceptedMessage = normalizeForComparison(
        copilotAcceptedMessage
      );
      const normalizedEditorMessage = normalizeForComparison(editorMessage);

      if (normalizedAcceptedMessage && normalizedEditorMessage) {
        useTrack(CAPTAIN_EVENTS.AI_ASSISTED_MESSAGE_SENT, {
          conversationId: this.conversationIdByRoute,
          channelType: this.channelType,
          editedBeforeSend:
            normalizedAcceptedMessage !== normalizedEditorMessage,
          isPrivate,
        });
      }

      // Analytics data for message signature is enabled or not in channels
      return isPrivate
        ? useTrack(CONVERSATION_EVENTS.SENT_PRIVATE_NOTE)
        : useTrack(CONVERSATION_EVENTS.SENT_MESSAGE, {
            channelType: this.channelType,
            signatureEnabled: this.sendWithSignature,
            hasReplyTo: !!this.inReplyTo?.id,
          });
    },
    async onSendReply() {
      const undefinedVariables = getUndefinedVariablesInMessage({
        message: this.message,
        variables: this.messageVariables,
      });
      if (undefinedVariables.length > 0) {
        const undefinedVariablesCount =
          undefinedVariables.length > 1 ? undefinedVariables.length : 1;
        this.undefinedVariableMessage = this.$t(
          'CONVERSATION.REPLYBOX.UNDEFINED_VARIABLES.MESSAGE',
          {
            undefinedVariablesCount,
            undefinedVariables: undefinedVariables.join(', '),
          }
        );

        const ok = await this.$refs.confirmDialog.showConfirmation();
        if (ok) {
          this.confirmOnSendReply();
        }
      } else {
        this.confirmOnSendReply();
      }
    },
    // With `waitForRequest` it resolves with the saved message once the request finished, and with nothing if it failed
    async sendMessage(
      messagePayload,
      editorMessage = '',
      copilotAcceptedMessage = '',
      waitForRequest = false
    ) {
      try {
        const action = waitForRequest
          ? 'createPendingMessageAndWait'
          : 'createPendingMessageAndSend';
        const savedMessage = await this.$store.dispatch(action, messagePayload);
        emitter.emit(BUS_EVENTS.SCROLL_TO_MESSAGE);
        emitter.emit(BUS_EVENTS.MESSAGE_SENT);
        this.removeFromDraft();
        this.sendMessageAnalyticsData(messagePayload.private, {
          editorMessage,
          copilotAcceptedMessage,
        });
        return savedMessage;
      } catch (error) {
        const errorMessage =
          error?.response?.data?.error || this.$t('CONVERSATION.MESSAGE_ERROR');
        useAlert(errorMessage);
        return undefined;
      }
    },
    async onSendWhatsAppReply(messagePayload) {
      this.sendMessage({
        conversationId: this.currentChat.id,
        ...messagePayload,
      });
      this.hideWhatsappTemplatesModal();
    },
    async onSendContentTemplateReply(messagePayload) {
      this.sendMessage({
        conversationId: this.currentChat.id,
        ...messagePayload,
      });
      this.hideContentTemplatesModal();
    },
    // The editor is rebuilt when the mode changes, and it takes focus on mount.
    // Skipping that leaves it as the agent had it: focused (keyboard stays
    // open) only if it was focused already.
    keepEditorFocusState(isFocused = this.isFocused) {
      this.focusEditorOnMount = isFocused;
      setTimeout(() => {
        this.focusEditorOnMount = !isPhoneViewport();
      }, 500);
    },
    setReplyMode(mode = REPLY_EDITOR_MODES.REPLY, { keepFocus = false } = {}) {
      if (keepFocus) this.keepEditorFocusState();
      this.$store.dispatch('draftMessages/setReplyEditorMode', { mode });
      if (this.canSendPublicReply) {
        this.carryOnNextModeSwitch = mode !== this.replyType;
        this.replyType = mode;
      }
      if (this.isRecordingAudio) {
        this.toggleAudioRecorder();
      }
    },
    clearEditorSelection() {
      this.updateEditorSelectionWith = '';
    },
    addIntoEditor(content) {
      this.updateEditorSelectionWith = content;
      this.onFocus();
    },
    openMacros() {
      this.addIntoEditor('#');
    },
    executeCopilotAction(action, data) {
      this.copilot.execute(action, data);
    },
    clearMessage() {
      this.message = '';
      this.clearCopilotAcceptedMessage();
      if (this.sendWithSignature && !this.isPrivate) {
        // if signature is enabled, append it to the message
        const effectiveChannelType = getEffectiveChannelType(
          this.channelType,
          this.inbox?.medium || ''
        );
        this.message = appendSignature(
          this.message,
          this.messageSignature,
          effectiveChannelType
        );
      }
      this.attachedFiles = [];
      this.isRecordingAudio = false;
      this.resetReplyToMessage();
      this.resetAudioRecorderInput();
    },
    clearEmailField() {
      this.ccEmails = '';
      this.bccEmails = '';
      this.toEmails = '';
    },

    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker;
    },
    toggleAudioRecorder() {
      this.isRecordingAudio = !this.isRecordingAudio;
      if (!this.isRecordingAudio) {
        // Closing the recorder rebuilds the editor: don't let it grab focus
        this.keepEditorFocusState(false);
        this.resetAudioRecorderInput();
      }
    },
    hideEmojiPicker() {
      if (this.showEmojiPicker) {
        this.toggleEmojiPicker();
      }
    },
    onTypingOn() {
      this.toggleTyping('on');
    },
    onTypingOff() {
      this.toggleTyping('off');
    },
    onBlur() {
      this.isFocused = false;
      this.saveDraft(this.conversationIdByRoute, this.effectiveReplyMode);
    },
    onFocus() {
      this.isFocused = true;
    },
    async onFinishRecorder(file) {
      this.hasRecordedAudio = true;
      // Added a new key isVoiceMessage to the file to identify recorded audio
      // Because to filter and show only non recorded audio and other attachments
      const autoRecordedFile = {
        ...file,
        isVoiceMessage: true,
      };
      if (file) await this.onFileUpload(autoRecordedFile);
      if (!this.sendAfterRecording) return;
      this.sendAfterRecording = false;
      if (this.attachedFiles.some(attached => attached.isVoiceMessage)) {
        this.onSendReply();
      }
    },
    // Stops the recording if needed, waits for the upload and sends once
    sendRecordedAudio() {
      if (this.sendAfterRecording) return;
      if (this.hasRecordedAudio) {
        this.onSendReply();
        return;
      }
      this.sendAfterRecording = true;
      this.$refs.audioRecorderInput?.stopRecording();
    },
    onRecordError({ reason } = {}) {
      this.sendAfterRecording = false;
      this.toggleAudioRecorder();
      if (reason === 'microphone') {
        useAlert(this.$t('CONVERSATION.REPLYBOX.AUDIO.MIC_UNAVAILABLE'));
        return;
      }
      useAlert(this.$t('CONVERSATION.REPLYBOX.AUDIO_CONVERSION_FAILED'));
    },
    toggleTyping(status) {
      const conversationId = this.currentChat.id;
      const isPrivate = this.isPrivate;

      if (!conversationId) {
        return;
      }

      this.$store.dispatch('conversationTypingStatus/toggleTyping', {
        status,
        conversationId,
        isPrivate,
      });
    },
    // Saved HD images arrive as such; videos and images that fit the standard size never do
    async getCannedFileHdState(file) {
      const policy = getImageOptimizationPolicy({
        inbox: this.inbox,
        mime: file.type,
        installationLimit: this.installationLimit,
      });
      if (!policy?.supportsHd) return false;

      const longestSide = await getLongestSide(file).catch(() => null);
      return longestSide > policy.standardMaxSide;
    },
    // Rails' proxy route streams the file through the app, so it works with any storage service without CORS
    async downloadCannedFile(cannedFile) {
      try {
        const response = await fetch(
          cannedFile.file_url.replace('/blobs/redirect/', '/blobs/proxy/')
        );
        if (!response.ok) throw new Error(response.status);

        const blob = await response.blob();
        const file = new File([blob], cannedFile.filename, {
          type: cannedFile.content_type,
        });
        return {
          id: `canned-${cannedFile.id}`,
          cannedFileId: cannedFile.id,
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          isHd: await this.getCannedFileHdState(file),
        };
      } catch (error) {
        useAlert(
          this.$t('CONVERSATION.CANNED_FILE_DOWNLOAD_FAILED', {
            name: cannedFile.filename,
          })
        );
        return null;
      }
    },
    // The files were optimized when the canned response was saved, so they skip the optimizer here
    async onCannedResponseSelected({ files }) {
      if (!files?.length) return;
      if (!this.showFileUpload && !this.isOnPrivateNote) return;

      const context = this.getComposerContext();
      // Keeps Send disabled while the files are downloaded
      this.uploadingFiles.push(context);
      try {
        // Files are loaded one by one to keep the order of the canned response
        /* eslint-disable no-await-in-loop */
        for (let index = 0; index < files.length; index += 1) {
          const cannedFile = files[index];
          const isStaged = this.attachedFiles.some(
            attachment => attachment.cannedFileId === cannedFile.id
          );
          const file = isStaged
            ? null
            : await this.downloadCannedFile(cannedFile);
          if (!this.isSameComposerContext(context)) return;
          if (file) await this.onFileUpload(file, { skipPreparation: true });
        }
        /* eslint-enable no-await-in-loop */
      } finally {
        this.untrack('uploadingFiles', context);
      }
    },
    attachFile({ blob, file }) {
      if (!this.showFileUpload && !this.isOnPrivateNote) {
        return Promise.resolve();
      }

      const context = this.getComposerContext();
      // Only images are previewed, so other files are never read into a data URL
      const hasThumb = file.file.type?.startsWith('image/');
      const originalMime =
        (file.originalFile || file).file?.type ||
        (file.originalFile || file).type;
      return new Promise(resolve => {
        const addAttachment = thumb => {
          // The agent may have switched conversation or reply mode while the thumbnail was read
          if (!this.isSameComposerContext(context)) {
            resolve();
            return;
          }
          this.attachedFiles.push({
            currentChatId: this.currentChat.id,
            resource: blob || file,
            isPrivate: this.isPrivate,
            thumb,
            blobSignedId: blob ? blob.signed_id : undefined,
            isVoiceMessage: file?.isVoiceMessage || false,
            originalFile: file.originalFile || file,
            cannedFileId: file.cannedFileId,
            // A canned file is already optimized and its original is gone, so it can't be switched
            canToggleHd:
              !file.cannedFileId &&
              (isOptimizableImageMime(originalMime) ||
                !!getVideoOptimizationPolicy({
                  inbox: this.inbox,
                  mime: originalMime,
                  installationLimit: this.installationLimit,
                })),
            isHd: !!file.isHd,
            sendAsHd: !!file.isHd,
            isOptimizing: false,
          });
          resolve();
        };
        if (!hasThumb) {
          addAttachment(undefined);
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file.file);
        reader.onloadend = () => addAttachment(reader.result);
      });
    },
    // Re-optimizes the original image or video with the HD (or standard) profile and uploads it again
    async toggleHd(attachment) {
      if (attachment.isOptimizing || !attachment.originalFile) return;

      const isHd = !attachment.isHd;
      const originalMime =
        attachment.originalFile.file?.type || attachment.originalFile.type;
      const isVideo = originalMime?.startsWith('video/');
      const policy = getImageOptimizationPolicy({
        inbox: this.inbox,
        mime: originalMime,
        installationLimit: this.installationLimit,
      });
      const context = this.getComposerContext();
      attachment.isOptimizing = true;
      try {
        const prepared = await this.prepareMediaForUpload(
          attachment.originalFile,
          isHd ? 'hd' : 'standard'
        );
        if (!prepared || !this.isSameComposerContext(context)) return;

        const blob = this.globalConfig.directUploadsEnabled
          ? await this.uploadDirectly(prepared)
          : undefined;
        const thumb = isVideo
          ? undefined
          : await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(prepared.file);
            });
        // The HD mark only reaches the customer when the image is larger than the standard size
        const longestSide =
          isHd && !isVideo
            ? await getLongestSide(prepared.file).catch(() => null)
            : null;
        if (!this.isSameComposerContext(context)) return;

        Object.assign(attachment, {
          resource: blob || prepared,
          thumb,
          blobSignedId: blob ? blob.signed_id : undefined,
          isHd,
          sendAsHd:
            !isVideo &&
            isHd &&
            (longestSide === null || longestSide > policy?.standardMaxSide),
        });
      } catch (error) {
        useAlert(error?.message || error);
      } finally {
        attachment.isOptimizing = false;
      }
    },
    removeAttachment(attachments) {
      const wasFocused = this.isFocused;
      this.attachedFiles = attachments;
      // Taking a file off the list must not bring the keyboard up
      if (!wasFocused) {
        this.$nextTick(() => {
          if (!this.isFocused) document.activeElement?.blur?.();
        });
      }
    },
    setReplyToInPayload(payload) {
      if (this.inReplyTo?.id) {
        return {
          ...payload,
          contentAttributes: {
            ...payload.contentAttributes,
            in_reply_to: this.inReplyTo.id,
          },
        };
      }

      return payload;
    },
    getMultipleMessagesPayload(message) {
      const multipleMessagePayload = [];

      if (this.attachedFiles && this.attachedFiles.length) {
        let caption =
          this.isAnInstagramChannel || this.isATiktokChannel ? '' : message;
        this.attachedFiles.forEach(attachment => {
          const attachedFile = this.globalConfig.directUploadsEnabled
            ? attachment.blobSignedId
            : attachment.resource.file;
          let attachmentPayload = {
            conversationId: this.currentChat.id,
            files: [attachedFile],
            private: false,
            message: caption,
            sender: this.sender,
            isVoiceMessage: attachment.isVoiceMessage || false,
          };
          if (attachment.sendAsHd) {
            attachmentPayload.contentAttributes = { image_quality: 'hd' };
          }

          attachmentPayload = this.setReplyToInPayload(attachmentPayload);
          multipleMessagePayload.push(attachmentPayload);
          // For WhatsApp, only the first attachment gets a caption
          if (!this.isAnInstagramChannel) caption = '';
        });
      }

      const hasNoAttachments =
        !this.attachedFiles || !this.attachedFiles.length;
      // For Instagram and TikTok, text must always be sent as a separate message (no captions on attachments).
      // For WhatsApp, we only need a text message if there are no attachments.
      if (
        ((this.isAnInstagramChannel || this.isATiktokChannel) &&
          this.message) ||
        (!(this.isAnInstagramChannel || this.isATiktokChannel) &&
          hasNoAttachments)
      ) {
        let messagePayload = {
          conversationId: this.currentChat.id,
          message,
          private: false,
          sender: this.sender,
        };

        messagePayload = this.setReplyToInPayload(messagePayload);

        multipleMessagePayload.push(messagePayload);
      }

      return multipleMessagePayload;
    },
    getMessagePayload(message) {
      const messageWithQuote = this.getMessageWithQuotedEmailText(message);

      let messagePayload = {
        conversationId: this.currentChat.id,
        message: messageWithQuote,
        private: this.isPrivate,
        sender: this.sender,
      };
      messagePayload = this.setReplyToInPayload(messagePayload);

      if (this.attachedFiles && this.attachedFiles.length) {
        messagePayload.files = [];
        this.attachedFiles.forEach(attachment => {
          if (this.globalConfig.directUploadsEnabled) {
            messagePayload.files.push(attachment.blobSignedId);
            if (attachment.isVoiceMessage) {
              messagePayload.isVoiceMessage = true;
            }
          } else {
            messagePayload.files.push(attachment.resource.file);
          }
        });
      }

      if (this.ccEmails && !this.isOnPrivateNote) {
        messagePayload.ccEmails = this.ccEmails;
      }

      if (this.bccEmails && !this.isOnPrivateNote) {
        messagePayload.bccEmails = this.bccEmails;
      }

      if (this.toEmails && !this.isOnPrivateNote) {
        messagePayload.toEmails = this.toEmails;
      }

      if (this.subject && !this.isOnPrivateNote) {
        messagePayload.subject = this.subject;
      }
      return messagePayload;
    },
    setCcEmails(value) {
      this.bccEmails = value.bccEmails;
      this.ccEmails = value.ccEmails;
    },
    setCCAndToEmailsFromLastChat() {
      const conversationContact = this.currentChat?.meta?.sender?.email || '';
      const { email: inboxEmail, forward_to_email: forwardToEmail } =
        this.inbox;

      const { cc, bcc, to } = getRecipients(
        this.lastEmail,
        conversationContact,
        inboxEmail,
        forwardToEmail
      );

      this.toEmails = to.join(', ');
      this.ccEmails = cc.join(', ');
      this.bccEmails = bcc.join(', ');
    },
    fetchAndSetReplyTo() {
      const replyStorageKey = LOCAL_STORAGE_KEYS.MESSAGE_REPLY_TO;
      const replyToMessageId = LocalStorage.getFromJsonStore(
        replyStorageKey,
        this.conversationId
      );

      this.inReplyTo = this.currentChat?.messages?.find(message => {
        if (message.id === replyToMessageId) {
          return true;
        }
        return false;
      });
    },
    onReplyToMessage() {
      this.fetchAndSetReplyTo();
      if (this.inReplyTo) {
        this.$nextTick(() => {
          const pos = this.isSignatureEnabledForInbox ? 'start' : 'end';
          this.messageEditor?.focusEditorInputField(pos);
        });
      }
    },
    resetReplyToMessage() {
      const replyStorageKey = LOCAL_STORAGE_KEYS.MESSAGE_REPLY_TO;
      LocalStorage.deleteFromJsonStore(replyStorageKey, this.conversationId);
      emitter.emit(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE);
    },
    onNewConversationModalActive(isActive) {
      // Issue is if the new conversation modal is open and we drag and drop the file
      // then the file is not getting attached to the new conversation modal
      // and it is getting attached to the current conversation reply box
      // so to fix this we are removing the drag and drop event listener from the current conversation reply box
      // When new conversation modal is open
      this.newConversationModalActive = isActive;
    },
    onSearchPopoverClose() {
      this.showArticleSearchPopover = false;
    },
    toggleInsertArticle() {
      this.showArticleSearchPopover = !this.showArticleSearchPopover;
    },
    resetAudioRecorderInput() {
      this.isRecordingAudio = false;
      this.sendAfterRecording = false;
      this.hasRecordedAudio = false;
      // Only clear the recorded audio when we click toggle button.
      this.attachedFiles = this.attachedFiles.filter(
        file => !file?.isVoiceMessage
      );
    },
    toggleEditorSize() {
      this.$emit('toggleEditorSize');
      this.$nextTick(() => this.messageEditor?.focusEditorInputField());
    },
    onSubmitCopilotReply() {
      const acceptedMessage = this.copilot.accept();
      this.message = acceptedMessage;
      this.setCopilotAcceptedMessage(acceptedMessage);
    },
  },
};
</script>

<template>
  <ReplyBoxBanner :message="message" :is-on-private-note="isOnPrivateNote" />
  <div
    class="reply-box max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] max-sm:items-center max-sm:gap-x-1 max-sm:gap-y-0 max-sm:group-data-[grown]/wrapper:gap-y-1 max-sm:group-data-[expanded]/wrapper:gap-y-2 max-sm:!mx-2 max-sm:!mb-[max(0.5rem,env(safe-area-inset-bottom))] max-sm:!rounded-3xl max-sm:!border-0 max-sm:p-1 max-sm:shadow-sm"
    :class="[
      replyBoxClass,
      isOnPrivateNote ? 'max-sm:!bg-n-solid-amber' : 'max-sm:!bg-n-slate-3',
    ]"
  >
    <!-- While recording the recorder bar is the only row of the composer -->
    <div :class="showAudioRecorderEditor ? 'hidden' : 'contents'">
      <ReplyTopPanel
        :mode="replyType"
        :conversation-id="conversationId"
        :is-reply-restricted="!canSendPublicReply"
        :disabled="copilot.isActive.value && copilot.isButtonDisabled.value"
        :is-editor-disabled="isEditorDisabled"
        :is-message-length-reaching-threshold="isMessageLengthReachingThreshold"
        :characters-remaining="charactersRemaining"
        :editor-content="message"
        :has-content="hasMeaningfulEditorContent"
        @set-reply-mode="setReplyMode"
        @toggle-editor-size="toggleEditorSize"
        @toggle-copilot="copilot.toggleEditor"
        @execute-copilot-action="executeCopilotAction"
      />
    </div>
    <ArticleSearchPopover
      v-if="showArticleSearchPopover && connectedPortalSlug"
      :selected-portal-slug="connectedPortalSlug"
      @insert="handleInsert"
      @close="onSearchPopoverClose"
    />
    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]"
    >
      <div
        :key="copilot.editorTransitionKey.value"
        class="reply-box__top max-sm:!static max-sm:row-start-1 max-sm:group-data-[grown]/wrapper:row-span-2 max-sm:group-data-[expanded]/wrapper:row-start-2 max-sm:!bg-transparent max-sm:!rounded-none max-sm:!border-0 max-sm:group-data-[expanded]/wrapper:animate-fade-in-up max-sm:min-w-0 max-sm:!px-0 max-sm:!mt-0"
        :class="
          showAudioRecorderEditor
            ? 'max-sm:col-start-1 max-sm:col-span-4 max-sm:!row-start-1 max-sm:!row-span-1'
            : 'max-sm:col-start-2 max-sm:group-data-[expanded]/wrapper:col-start-1 max-sm:group-data-[expanded]/wrapper:col-span-4'
        "
      >
        <ReplyToMessage
          v-if="shouldShowReplyToMessage"
          :message="inReplyTo"
          @dismiss="resetReplyToMessage"
        />
        <EmojiIconPicker
          v-if="showEmojiPicker"
          v-on-clickaway="hideEmojiPicker"
          mode="emoji"
          class="emoji-dialog"
          :class="{
            'emoji-dialog--expanded': isOnExpandedLayout,
          }"
          @select="addIntoEditor($event.value)"
        />
        <ReplyEmailHead
          v-if="showReplyHead && isDefaultEditorMode"
          :key="currentChat.id"
          v-model:cc-emails="ccEmails"
          v-model:bcc-emails="bccEmails"
          v-model:to-emails="toEmails"
          v-model:subject="subject"
        />
        <AudioRecorder
          v-if="showAudioRecorderEditor"
          ref="audioRecorderInput"
          :audio-record-format="audioRecordFormat"
          :is-sending="sendAfterRecording"
          :is-note="isOnPrivateNote"
          @finish-record="onFinishRecorder"
          @record-error="onRecordError"
          @delete="toggleAudioRecorder"
          @send="sendRecordedAudio"
        />
        <CopilotEditorSection
          v-if="copilot.isActive.value && !showAudioRecorderEditor"
          :show-copilot-editor="copilot.showEditor.value"
          :is-generating-content="copilot.isGenerating.value"
          :generated-content="copilot.generatedContent.value"
          :placeholder="$t('CONVERSATION.FOOTER.COPILOT_MSG_INPUT')"
          @focus="onFocus"
          @blur="onBlur"
          @clear-selection="clearEditorSelection"
          @close="copilot.showEditor.value = false"
          @content-ready="copilot.setContentReady"
          @send="copilot.sendFollowUp"
        />
        <WootMessageEditor
          v-else-if="!showAudioRecorderEditor"
          ref="messageEditor"
          v-model="message"
          :conversation-id="conversationId"
          :editor-id="editorStateId"
          class="input popover-prosemirror-menu resizable-editor-split max-sm:!bg-transparent max-sm:rounded-none max-sm:ps-2 max-sm:pe-2 max-sm:py-2 max-sm:text-base max-sm:leading-[1.3125rem] max-sm:[&_p.empty-node]:relative max-sm:[&_p.empty-node::before]:max-w-full max-sm:[&_p.empty-node::before]:truncate"
          :is-private="isOnPrivateNote"
          :placeholder="messagePlaceHolder"
          :update-selection-with="updateEditorSelectionWith"
          :min-height="4"
          :focus-on-mount="focusEditorOnMount"
          :disabled="isEditorDisabled"
          enable-insert-events
          :enable-macros="isMacrosEnabled"
          enable-variables
          :variables="messageVariables"
          :signature="messageSignature"
          allow-signature
          :channel-type="channelType"
          :medium="inbox.medium"
          @typing-off="onTypingOff"
          @typing-on="onTypingOn"
          @focus="onFocus"
          @blur="onBlur"
          @toggle-user-mention="toggleUserMention"
          @toggle-canned-menu="toggleCannedMenu"
          @canned-response-selected="onCannedResponseSelected"
          @toggle-variables-menu="toggleVariablesMenu"
          @toggle-macros-menu="toggleMacrosMenu"
          @execute-macro="onExecuteMacro"
          @clear-selection="clearEditorSelection"
          @execute-copilot-action="executeCopilotAction"
        >
          <template #footer>
            <QuotedEmailPreview
              v-if="shouldIncludeQuotedEmail"
              :key="conversationId"
              :quoted-email-text="quotedEmailText"
              :header="quotedEmailHeader"
              @remove="removeQuotedEmail"
            />
          </template>
        </WootMessageEditor>

        <div
          v-if="(isOptimizingImage || isOptimizingVideo) && isDefaultEditorMode"
          class="flex items-center gap-2 mb-2 text-sm text-n-slate-11"
        >
          <Spinner class="!w-4 !h-4" />
          <template v-if="isOptimizingVideo">
            {{
              $t('CONVERSATION.VIDEO_OPTIMIZATION.OPTIMIZING', {
                PERCENT: videoOptimizationPercent,
              })
            }}
          </template>
          <template v-else>
            {{ $t('CONVERSATION.IMAGE_OPTIMIZATION.OPTIMIZING') }}
          </template>
        </div>
        <div
          v-if="
            hasAttachments && isDefaultEditorMode && !showAudioRecorderEditor
          "
          class="bg-transparent py-0 sm:mb-2 max-sm:absolute max-sm:inset-x-0 max-sm:bottom-full max-sm:z-10 max-sm:bg-n-surface-1 max-sm:border-t max-sm:border-n-weak max-sm:p-2"
          @paste="onPaste"
        >
          <AttachmentPreview
            class="sm:mt-2"
            :attachments="attachedFiles"
            :show-hd-toggle="supportsHdToggle"
            @remove-attachment="removeAttachment"
            @toggle-hd="toggleHd"
          />
        </div>
        <MessageSignatureMissingAlert
          v-if="
            isSignatureEnabledForInbox &&
            !isSignatureAvailable &&
            isDefaultEditorMode
          "
          class="mb-2"
        />
      </div>
    </Transition>

    <Transition
      mode="out-in"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]"
    >
      <CopilotReplyBottomPanel
        v-if="copilot.isActive.value"
        key="copilot-bottom-panel"
        :is-generating-content="copilot.isButtonDisabled.value"
        @submit="onSubmitCopilotReply"
        @cancel="copilot.reset"
      />
      <ReplyBottomPanel
        v-else
        key="reply-bottom-panel"
        :class="{ '!hidden': showAudioRecorderEditor }"
        :conversation-id="conversationId"
        :enable-multiple-file-upload="enableMultipleFileUpload"
        :enable-whats-app-templates="showWhatsappTemplates"
        :enable-content-templates="showContentTemplates"
        :enable-macros="isMacrosEnabled"
        :enable-whatsapp-catalog="showWhatsappCatalog"
        :enable-whatsapp-location="showWhatsappLocation"
        :inbox="inbox"
        :is-on-private-note="isOnPrivateNote"
        :is-recording-audio="isRecordingAudio"
        :is-send-disabled="isReplyButtonDisabled"
        :has-content="hasMeaningfulEditorContent || !!hasAttachments"
        :is-note="isPrivate"
        :is-editor-disabled="isEditorDisabled"
        :on-file-upload="onFileUpload"
        :on-send="onSendReply"
        :conversation-type="conversationType"
        :send-button-text="replyButtonLabel"
        :show-audio-recorder="showAudioRecorder"
        :show-emoji-picker="showEmojiPicker"
        :show-file-upload="showFileUpload"
        :toggle-audio-recorder-play-pause="toggleAudioRecorderPlayPause"
        :toggle-audio-recorder="toggleAudioRecorder"
        :toggle-emoji-picker="toggleEmojiPicker"
        :message="message"
        :portal-slug="connectedPortalSlug"
        :new-conversation-modal-active="newConversationModalActive"
        @select-whatsapp-template="openWhatsappTemplateModal"
        @select-content-template="openContentTemplateModal"
        @select-catalog="openWhatsappCatalog"
        @select-location="openLocationPicker"
        @toggle-insert-article="toggleInsertArticle"
        @request-contact-info-template="openContactInfoTemplateModal"
        @open-macros="openMacros"
      />
    </Transition>

    <WhatsappTemplates
      :inbox-id="inbox.id"
      :show="showWhatsAppTemplatesModal"
      :send-rendered-content="isAPIInbox"
      :request-contact-info-only="requestContactInfoTemplatesOnly"
      @close="hideWhatsappTemplatesModal"
      @on-send="onSendWhatsAppReply"
      @cancel="hideWhatsappTemplatesModal"
    />

    <WhatsappCatalogModal
      v-model:show="showWhatsappCatalogModal"
      :inbox-id="inbox.id"
      :conversation-id="conversationId"
      :initial-body="message"
      :catalog-link="whatsappCatalogLink"
      @insert-link="insertWhatsappCatalogLink"
      @sent="onWhatsappCatalogSent"
    />

    <LocationPicker
      v-model:show="showLocationPicker"
      :conversation-id="conversationId"
      :locations="inbox.locations || []"
    />

    <ContentTemplates
      :inbox-id="inbox.id"
      :show="showContentTemplatesModal"
      @close="hideContentTemplatesModal"
      @on-send="onSendContentTemplateReply"
      @cancel="hideContentTemplatesModal"
    />

    <ConversationResolveAttributesModal
      ref="resolveAttributesModal"
      @submit="macroExecution.submitPendingAttributes"
      @close="macroExecution.dismissPendingAttributes"
    />

    <woot-confirm-modal
      ref="confirmDialog"
      :title="$t('CONVERSATION.REPLYBOX.UNDEFINED_VARIABLES.TITLE')"
      :description="undefinedVariableMessage"
    />
  </div>
</template>

<style lang="scss" scoped>
.send-button {
  @apply mb-0;
}

.reply-box {
  @apply relative mb-2 mx-2 border border-n-weak rounded-xl bg-n-solid-1;

  &.is-private {
    @apply bg-n-solid-amber dark:border-n-amber-3/10 border-n-amber-12/5;
  }
}

.send-button {
  @apply mb-0;
}

.reply-box__top {
  @apply relative py-0 px-3 -mt-px;
}

.emoji-dialog {
  @apply top-[unset] -bottom-10 ltr:-left-80 ltr:right-[unset] rtl:left-[unset] rtl:-right-80;

  &::before {
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.08));
    @apply ltr:-right-4 bottom-2 rtl:-left-4 ltr:rotate-[270deg] rtl:rotate-[90deg];
  }
}

.emoji-dialog--expanded {
  @apply left-[unset] bottom-0 absolute z-[100];

  &::before {
    transform: rotate(0deg);
    @apply ltr:left-1 rtl:right-1 -bottom-2;
  }
}
</style>
