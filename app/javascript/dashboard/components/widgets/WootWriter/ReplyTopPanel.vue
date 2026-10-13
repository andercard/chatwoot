<script>
import { ref } from 'vue';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useCaptain } from 'dashboard/composables/useCaptain';
import { useTrack } from 'dashboard/composables';
import { vOnClickOutside } from '@vueuse/components';
import { REPLY_EDITOR_MODES, CHAR_LENGTH_WARNING } from './constants';
import { CAPTAIN_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import NextButton from 'dashboard/components-next/button/Button.vue';
import EditorModeToggle from './EditorModeToggle.vue';
import CopilotMenuBar from './CopilotMenuBar.vue';

export default {
  name: 'ReplyTopPanel',
  components: {
    NextButton,
    EditorModeToggle,
    CopilotMenuBar,
  },
  directives: {
    OnClickOutside: vOnClickOutside,
  },
  props: {
    mode: {
      type: String,
      default: REPLY_EDITOR_MODES.REPLY,
    },
    isReplyRestricted: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    isEditorDisabled: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: Number,
      default: null,
    },
    isMessageLengthReachingThreshold: {
      type: Boolean,
      default: () => false,
    },
    charactersRemaining: {
      type: Number,
      default: () => 0,
    },
    editorContent: {
      type: String,
      default: undefined,
    },
    hasContent: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['setReplyMode', 'toggleEditorSize', 'executeCopilotAction'],
  setup(props, { emit }) {
    const setReplyMode = mode => {
      emit('setReplyMode', mode);
    };
    const handleReplyClick = () => {
      if (props.isReplyRestricted) return;
      setReplyMode(REPLY_EDITOR_MODES.REPLY);
    };
    const handleNoteClick = () => {
      setReplyMode(REPLY_EDITOR_MODES.NOTE);
    };
    const handleModeToggle = () => {
      const newMode =
        props.mode === REPLY_EDITOR_MODES.REPLY
          ? REPLY_EDITOR_MODES.NOTE
          : REPLY_EDITOR_MODES.REPLY;
      setReplyMode(newMode);
    };

    const { captainTasksEnabled } = useCaptain();
    const showCopilotMenu = ref(false);
    const copilotToggleRef = ref(null);

    const handleCopilotAction = (actionKey, data) => {
      emit('executeCopilotAction', actionKey, data || props.editorContent);
      showCopilotMenu.value = false;
    };

    const toggleCopilotMenu = () => {
      const isOpening = !showCopilotMenu.value;
      if (isOpening) {
        useTrack(CAPTAIN_EVENTS.EDITOR_AI_MENU_OPENED, {
          conversationId: props.conversationId,
          entryPoint: 'top_panel',
        });
      }
      showCopilotMenu.value = isOpening;
    };

    const handleClickOutside = () => {
      showCopilotMenu.value = false;
    };

    const keyboardEvents = {
      'Alt+KeyP': {
        action: () => handleNoteClick(),
        allowOnFocusedInput: false,
      },
      'Alt+KeyL': {
        action: () => handleReplyClick(),
        allowOnFocusedInput: false,
      },
    };
    useKeyboardEvents(keyboardEvents);

    return {
      handleModeToggle,
      handleReplyClick,
      handleNoteClick,
      REPLY_EDITOR_MODES,
      captainTasksEnabled,
      handleCopilotAction,
      showCopilotMenu,
      copilotToggleRef,
      toggleCopilotMenu,
      handleClickOutside,
    };
  },
  computed: {
    replyButtonClass() {
      return {
        'is-active': this.mode === REPLY_EDITOR_MODES.REPLY,
      };
    },
    noteButtonClass() {
      return {
        'is-active': this.mode === REPLY_EDITOR_MODES.NOTE,
      };
    },
    charLengthClass() {
      return this.charactersRemaining < 0 ? 'text-n-ruby-9' : 'text-n-slate-11';
    },
    characterLengthWarning() {
      return this.charactersRemaining < 0
        ? `${-this.charactersRemaining} ${CHAR_LENGTH_WARNING.NEGATIVE}`
        : `${this.charactersRemaining} ${CHAR_LENGTH_WARNING.UNDER_50}`;
    },
  },
};
</script>

<template>
  <div
    class="flex justify-between gap-2 h-[3.25rem] items-center ltr:pl-3 ltr:pr-2 rtl:pr-3 rtl:pl-2 max-sm:contents"
  >
    <EditorModeToggle
      class="max-sm:hidden"
      :mode="mode"
      :disabled="disabled"
      :is-reply-restricted="isReplyRestricted"
      @toggle-mode="handleModeToggle"
    />
    <div
      class="flex items-center mx-4 my-0 max-sm:col-start-3 max-sm:row-start-2 max-sm:justify-self-end max-sm:group-data-[expanded]/wrapper:row-start-3"
    >
      <div v-if="isMessageLengthReachingThreshold" class="text-xs">
        <span :class="charLengthClass">
          {{ characterLengthWarning }}
        </span>
      </div>
    </div>
    <div
      v-if="captainTasksEnabled"
      class="flex items-center gap-2 max-sm:contents"
    >
      <div
        class="relative max-sm:hidden max-sm:group-data-[grown]/wrapper:block max-sm:group-data-[expanded]/wrapper:block max-sm:col-start-1 max-sm:row-start-1 max-sm:self-start"
      >
        <NextButton
          ref="copilotToggleRef"
          ghost
          :disabled="disabled || isEditorDisabled"
          :class="{
            'text-n-violet-9 hover:enabled:!bg-n-violet-3': !showCopilotMenu,
            'text-n-violet-9 bg-n-violet-3': showCopilotMenu,
          }"
          sm
          class="max-sm:!size-10"
          icon="i-ph-sparkle-fill"
          @click="toggleCopilotMenu"
        />
        <CopilotMenuBar
          v-if="showCopilotMenu"
          v-on-click-outside="[
            handleClickOutside,
            { ignore: [copilotToggleRef] },
          ]"
          :has-selection="false"
          :has-content="hasContent"
          :conversation-id="conversationId"
          class="ltr:right-0 rtl:left-0 max-sm:ltr:!right-auto max-sm:ltr:!left-0 max-sm:rtl:!left-auto max-sm:rtl:!right-0 bottom-full mb-2"
          @execute-copilot-action="handleCopilotAction"
        />
      </div>
      <NextButton
        ghost
        class="text-n-slate-11 max-sm:hidden"
        sm
        icon="i-lucide-maximize-2"
        @click="$emit('toggleEditorSize')"
      />
    </div>
    <NextButton
      ghost
      round
      sm
      class="sm:hidden !rounded-full !size-8 max-sm:!size-10 max-sm:col-start-3 max-sm:row-start-1 max-sm:self-center max-sm:group-data-[grown]/wrapper:row-start-2 max-sm:group-data-[grown]/wrapper:self-end max-sm:group-data-[expanded]/wrapper:row-start-3"
      :class="
        mode === REPLY_EDITOR_MODES.NOTE
          ? 'text-n-amber-11 bg-n-amber-3 hover:enabled:!bg-n-amber-4'
          : 'text-n-slate-11'
      "
      :icon="
        mode === REPLY_EDITOR_MODES.NOTE
          ? 'i-lucide-lock-keyhole'
          : 'i-lucide-lock-keyhole-open'
      "
      :disabled="disabled || isReplyRestricted"
      :aria-label="$t('CONVERSATION.REPLYBOX.PRIVATE_NOTE')"
      @click="handleModeToggle"
    />
    <NextButton
      ghost
      round
      sm
      class="sm:hidden max-sm:hidden !rounded-full !size-8 max-sm:!size-10 text-n-slate-11 max-sm:col-start-4 max-sm:row-start-1 max-sm:self-start max-sm:justify-self-end max-sm:group-data-[grown]/wrapper:flex"
      icon="i-lucide-maximize-2"
      @click="$emit('toggleEditorSize')"
    />
    <NextButton
      ghost
      round
      sm
      class="sm:hidden max-sm:hidden !rounded-full !size-8 max-sm:!size-10 text-n-slate-11 max-sm:col-start-4 max-sm:row-start-1 max-sm:self-start max-sm:justify-self-end max-sm:group-data-[expanded]/wrapper:flex"
      icon="i-lucide-minimize-2"
      @click="$emit('toggleEditorSize')"
    />
  </div>
</template>
