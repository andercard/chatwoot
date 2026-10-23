<script setup>
import { computed, ref, watch, inject, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { frontendURL, conversationUrl } from 'dashboard/helper/URLHelper';
import ConversationCard from './widgets/conversation/ConversationCard.vue';
import ConversationCardExpanded from 'dashboard/components-next/Conversation/ConversationCard/ConversationCardExpanded.vue';
import SwipeActions from 'dashboard/components-next/Conversation/ConversationCard/SwipeActions.vue';
import ConversationStatusSheet from 'dashboard/components-next/Conversation/ConversationCard/ConversationStatusSheet.vue';
import ConversationLabelsSheet from 'dashboard/components-next/Conversation/ConversationCard/ConversationLabelsSheet.vue';
import ContextMenu from 'dashboard/components/ui/ContextMenu.vue';
import ConversationContextMenu from './widgets/conversation/contextMenu/Index.vue';

const props = defineProps({
  source: { type: Object, required: true },
  teamId: { type: [String, Number], default: 0 },
  label: { type: String, default: '' },
  conversationType: { type: String, default: '' },
  foldersId: { type: [String, Number], default: 0 },
  showAssignee: { type: Boolean, default: false },
  showExpanded: { type: Boolean, default: false },
});

const router = useRouter();
const store = useStore();

const selectConversation = inject('selectConversation');
const deSelectConversation = inject('deSelectConversation');
const assignAgent = inject('assignAgent');
const assignTeam = inject('assignTeam');
const assignLabels = inject('assignLabels');
const removeLabels = inject('removeLabels');
const updateLabels = inject('updateLabels');
const updateConversationStatus = inject('updateConversationStatus');
const toggleContextMenu = inject('toggleContextMenu');
const markAsUnread = inject('markAsUnread');
const markAsRead = inject('markAsRead');
const assignPriority = inject('assignPriority');
const isConversationSelected = inject('isConversationSelected');
const deleteConversation = inject('deleteConversation');
const isSelectionMode = inject('isSelectionMode');
const setSelectionMode = inject('setSelectionMode');

const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
const LONG_PRESS_POINTER_TYPES = ['touch', 'pen'];

// --- Context menu state (shared by both layouts) ---
const showContextMenu = ref(false);
const contextMenu = ref({ x: null, y: null });

// Reset context menu state when the row is recycled to a different conversation.
watch(
  () => props.source.id,
  () => {
    if (showContextMenu.value) {
      toggleContextMenu(false);
    }
    showContextMenu.value = false;
    contextMenu.value = { x: null, y: null };
  }
);

const currentChat = useMapGetter('getSelectedChat');
const currentUser = useMapGetter('getCurrentUser');
const inboxesList = useMapGetter('inboxes/getInboxes');
const activeInbox = useMapGetter('getSelectedInbox');
const accountId = useMapGetter('getCurrentAccountId');

const chatMetadata = computed(() => props.source.meta || {});
const assignee = computed(() => chatMetadata.value.assignee || {});
const senderId = computed(() => chatMetadata.value.sender?.id);

const currentContact = computed(() =>
  senderId.value ? store.getters['contacts/getContact'](senderId.value) : {}
);

const isActiveChat = computed(() => currentChat.value.id === props.source.id);

const inbox = computed(() => {
  const inboxId = props.source.inbox_id;
  return inboxId ? store.getters['inboxes/getInbox'](inboxId) : {};
});

const showInboxName = computed(
  () => !activeInbox.value && inboxesList.value.length > 1
);
const isInboxView = computed(() => !!activeInbox.value);
const showAssigneeForExpandedCard = computed(
  () => props.showExpanded || props.showAssignee
);

const conversationPath = computed(() =>
  frontendURL(
    conversationUrl({
      accountId: accountId.value,
      activeInbox: activeInbox.value,
      id: props.source.id,
      label: props.label,
      teamId: props.teamId,
      conversationType: props.conversationType,
      foldersId: props.foldersId,
    })
  )
);

// --- Long press (touch/pen) enters selection mode ---
let longPressTimer = null;
let longPressStart = null;
let longPressFired = false;

const cancelLongPress = () => {
  clearTimeout(longPressTimer);
  longPressTimer = null;
};

const onPointerDown = e => {
  longPressFired = false;
  if (!LONG_PRESS_POINTER_TYPES.includes(e.pointerType)) return;
  longPressStart = { x: e.clientX, y: e.clientY };
  cancelLongPress();
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    longPressFired = true;
    setSelectionMode(true);
    if (!isConversationSelected(props.source.id)) {
      selectConversation(props.source.id, inbox.value.id);
    }
  }, LONG_PRESS_MS);
};

const onPointerMove = e => {
  if (!longPressTimer) return;
  const dx = e.clientX - longPressStart.x;
  const dy = e.clientY - longPressStart.y;
  if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) cancelLongPress();
};

onBeforeUnmount(cancelLongPress);

const toggleSelection = () => {
  if (isConversationSelected(props.source.id)) {
    deSelectConversation(props.source.id, inbox.value.id);
  } else {
    selectConversation(props.source.id, inbox.value.id);
  }
};

const onCardClick = e => {
  if (longPressFired) {
    longPressFired = false;
    return;
  }
  if (isSelectionMode.value) {
    toggleSelection();
    return;
  }

  const path = conversationPath.value;
  if (!path) return;

  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    window.open(
      `${window.chatwootConfig.hostURL}${path}`,
      '_blank',
      'noopener,noreferrer'
    );
    return;
  }

  if (isActiveChat.value) return;
  router.push({ path });
};

const onExpandedSelect = checked => {
  if (checked) {
    selectConversation(props.source.id, inbox.value.id);
  } else {
    deSelectConversation(props.source.id, inbox.value.id);
  }
};

const openContextMenu = e => {
  e.preventDefault();
  if (longPressTimer || longPressFired || isSelectionMode.value) return;
  toggleContextMenu(true);
  contextMenu.value.x = e.pageX || e.clientX;
  contextMenu.value.y = e.pageY || e.clientY;
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  toggleContextMenu(false);
  showContextMenu.value = false;
  contextMenu.value.x = null;
  contextMenu.value.y = null;
};

const onUpdateConversation = (status, snoozedUntil) => {
  closeContextMenu();
  updateConversationStatus(props.source.id, status, snoozedUntil);
};

const onAssignAgent = agent => {
  assignAgent(agent, [props.source.id]);
  closeContextMenu();
};

// --- Mobile swipe actions ---
const showStatusSheet = ref(false);
const showLabelsSheet = ref(false);

const showAssignMe = computed(() => assignee.value.id !== currentUser.value.id);

const onSwipeAssignMe = () => {
  assignAgent(currentUser.value, [props.source.id]);
};

const onStatusSheetUpdate = (status, snoozedUntil) => {
  showStatusSheet.value = false;
  updateConversationStatus(props.source.id, status, snoozedUntil);
};

const onAssignLabel = label => {
  assignLabels([label.title], [props.source.id]);
};

const onRemoveLabel = label => {
  removeLabels([label.title], [props.source.id]);
};

const onAssignTeam = team => {
  assignTeam(team, props.source.id);
  closeContextMenu();
};

const onMarkAsUnread = () => {
  markAsUnread(props.source.id);
  closeContextMenu();
};

const onMarkAsRead = () => {
  markAsRead(props.source.id);
  closeContextMenu();
};

const swipeProps = computed(() =>
  isSelectionMode.value
    ? {}
    : {
        hasUnread: props.source.unread_count > 0,
        showAssignMe: showAssignMe.value,
        onMarkUnread: onMarkAsUnread,
        onMarkRead: onMarkAsRead,
        onAssignMe: onSwipeAssignMe,
        onOpenStatus: () => {
          showStatusSheet.value = true;
        },
        onOpenLabels: () => {
          showLabelsSheet.value = true;
        },
      }
);

const onAssignPriority = priority => {
  assignPriority(priority, props.source.id);
  closeContextMenu();
};

const onDeleteConversation = () => {
  deleteConversation(props.source.id);
  closeContextMenu();
};
</script>

<template>
  <component
    :is="isSelectionMode ? 'div' : SwipeActions"
    v-bind="swipeProps"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="cancelLongPress"
    @pointercancel="cancelLongPress"
  >
    <!-- Expanded layout: wide screen + expanded setting -->
    <ConversationCardExpanded
      v-if="showExpanded"
      :chat="source"
      :current-contact="currentContact"
      :assignee="assignee"
      :inbox="inbox"
      :selected="isConversationSelected(source.id)"
      :is-active-chat="isActiveChat"
      :show-assignee="showAssigneeForExpandedCard"
      :show-inbox-name="showInboxName"
      :is-inbox-view="isInboxView"
      @select-conversation="onExpandedSelect"
      @de-select-conversation="onExpandedSelect"
      @click="onCardClick"
      @contextmenu="openContextMenu"
    />

    <!-- Default (condensed) layout -->
    <ConversationCard
      v-else
      :chat="source"
      :current-contact="currentContact"
      :assignee="assignee"
      :inbox="inbox"
      :selected="isConversationSelected(source.id)"
      :is-active-chat="isActiveChat"
      :show-assignee="showAssignee"
      :show-inbox-name="showInboxName"
      :selection-mode="isSelectionMode"
      @click="onCardClick"
      @contextmenu="openContextMenu"
      @select-conversation="selectConversation"
      @de-select-conversation="deSelectConversation"
    />
  </component>

  <ConversationStatusSheet
    :show="showStatusSheet"
    :status="source.status"
    @close="showStatusSheet = false"
    @update="onStatusSheetUpdate"
  />

  <ConversationLabelsSheet
    v-if="showLabelsSheet"
    :conversation-id="source.id"
    :conversation-labels="source.labels"
    :update-labels="updateLabels"
    @close="showLabelsSheet = false"
  />

  <!-- Shared context menu for both layouts -->
  <ContextMenu
    v-if="showContextMenu"
    :x="contextMenu.x"
    :y="contextMenu.y"
    @close="closeContextMenu"
  >
    <ConversationContextMenu
      :status="source.status"
      :inbox-id="inbox.id"
      :priority="source.priority"
      :chat-id="source.id"
      :has-unread-messages="source.unread_count > 0"
      :conversation-labels="source.labels"
      :conversation-url="conversationPath"
      @update-conversation="onUpdateConversation"
      @assign-agent="onAssignAgent"
      @assign-label="onAssignLabel"
      @remove-label="onRemoveLabel"
      @assign-team="onAssignTeam"
      @mark-as-unread="onMarkAsUnread"
      @mark-as-read="onMarkAsRead"
      @assign-priority="onAssignPriority"
      @delete-conversation="onDeleteConversation"
      @close="closeContextMenu"
    />
  </ContextMenu>
</template>
