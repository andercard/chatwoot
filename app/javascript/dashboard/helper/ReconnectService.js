import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { differenceInSeconds } from 'date-fns';
import BaseActionCableConnector from 'shared/helpers/BaseActionCableConnector';
import {
  isAConversationRoute,
  isAInboxViewRoute,
} from 'dashboard/helper/routeHelpers';

const MAX_DISCONNECT_SECONDS = 10800;
const HIDDEN_REFRESH_THRESHOLD_SECONDS = 20;
// A refresh finished this recently already covers any other
// visibility/online trigger, so we skip the duplicate.
// A websocket reconnect is never deduplicated.
const REFRESH_DEDUPE_WINDOW_MS = 10000;

class ReconnectService {
  constructor(store, router) {
    this.store = store;
    this.router = router;
    this.disconnectTime = null;
    this.hiddenAt = null;
    this.lastRefreshAt = 0;
    this.isRefreshing = false;
    this.reconnectRefresh = null;

    this.setupEventListeners();
  }

  disconnect = () => this.removeEventListeners();

  setupEventListeners = () => {
    window.addEventListener('online', this.handleOnlineEvent);
    window.addEventListener('pageshow', this.handleVisible);
    window.addEventListener('pagehide', this.markHidden);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    emitter.on(BUS_EVENTS.WEBSOCKET_RECONNECT, this.onReconnect);
    emitter.on(BUS_EVENTS.WEBSOCKET_DISCONNECT, this.onDisconnect);
  };

  removeEventListeners = () => {
    window.removeEventListener('online', this.handleOnlineEvent);
    window.removeEventListener('pageshow', this.handleVisible);
    window.removeEventListener('pagehide', this.markHidden);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );
    emitter.off(BUS_EVENTS.WEBSOCKET_RECONNECT, this.onReconnect);
    emitter.off(BUS_EVENTS.WEBSOCKET_DISCONNECT, this.onDisconnect);
  };

  getSecondsSinceDisconnect = () =>
    this.disconnectTime
      ? Math.max(differenceInSeconds(new Date(), this.disconnectTime), 0)
      : 0;

  // Force reload if the user is disconnected for more than 3 hours
  handleOnlineEvent = () => {
    if (this.getSecondsSinceDisconnect() >= MAX_DISCONNECT_SECONDS) {
      window.location.reload();
      return;
    }
    this.refreshQuietly();
  };

  refreshQuietly = () => this.refreshData().catch(() => {});

  markHidden = () => {
    this.hiddenAt ??= new Date();
  };

  handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') this.markHidden();
    else this.handleVisible();
  };

  handleVisible = () => {
    if (!this.hiddenAt) return;
    const hiddenSeconds = differenceInSeconds(new Date(), this.hiddenAt);
    this.hiddenAt = null;
    if (hiddenSeconds > HIDDEN_REFRESH_THRESHOLD_SECONDS) this.refreshQuietly();
  };

  runRefresh = async () => {
    try {
      await this.handleRouteSpecificFetch();
      await this.revalidateCaches();
    } finally {
      this.lastRefreshAt = Date.now();
    }
  };

  // Entry point for visibility and online triggers. While
  // the websocket is down it does nothing: onReconnect does the refresh.
  // Skips if one is running or just finished to avoid bursts.
  refreshData = async () => {
    if (
      BaseActionCableConnector.isDisconnected ||
      this.isRefreshing ||
      Date.now() - this.lastRefreshAt < REFRESH_DEDUPE_WINDOW_MS
    ) {
      return false;
    }
    this.isRefreshing = true;
    try {
      await this.runRefresh();
    } finally {
      this.isRefreshing = false;
    }
    return true;
  };

  fetchConversations = async () => {
    await this.store.dispatch('updateChatListFilters', {
      page: 1,
      updatedWithin: null,
    });
    await this.store.dispatch('fetchAllConversations', {
      replaceExisting: true,
    });
  };

  fetchFilteredOrSavedConversations = async queryData => {
    try {
      await this.store.dispatch('fetchFilteredConversations', {
        queryData,
        page: 1,
        replaceExisting: true,
      });
    } catch (error) {
      // Ignore error, reconnect flow should continue
    }
  };

  fetchConversationsOnReconnect = async () => {
    const {
      getAppliedConversationFiltersQuery,
      'customViews/getActiveConversationFolder': activeFolder,
    } = this.store.getters;
    const query = getAppliedConversationFiltersQuery?.payload?.length
      ? getAppliedConversationFiltersQuery
      : activeFolder?.query;
    if (query) {
      await this.fetchFilteredOrSavedConversations(query);
    } else {
      await this.fetchConversations();
    }
  };

  refreshActiveConversationOnReconnect = async () => {
    const { conversation_id: conversationId } =
      this.router.currentRoute.value.params;
    if (conversationId) {
      await this.store.dispatch('getConversation', Number(conversationId));
      await this.store.dispatch('syncActiveConversationMessages', {
        conversationId: Number(conversationId),
      });
    }
  };

  fetchNotificationsOnReconnect = async filter => {
    await this.store.dispatch('notifications/index', { ...filter, page: 1 });
  };

  revalidateCaches = async () => {
    const { label, inbox, team } = await this.store.dispatch(
      'accounts/getCacheKeys'
    );
    await Promise.all([
      this.store.dispatch('labels/revalidate', { newKey: label }),
      this.store.dispatch('inboxes/revalidate', { newKey: inbox }),
      this.store.dispatch('teams/revalidate', { newKey: team }),
    ]);
  };

  handleRouteSpecificFetch = async () => {
    const currentRoute = this.router.currentRoute.value.name;
    if (isAConversationRoute(currentRoute, true)) {
      await this.fetchConversationsOnReconnect();
      await this.refreshActiveConversationOnReconnect();
    } else if (isAInboxViewRoute(currentRoute, true)) {
      await this.fetchNotificationsOnReconnect(
        this.store.getters['notifications/getNotificationFilters']
      );
    }
  };

  setConversationLastMessageId = async () => {
    const { conversation_id: conversationId } =
      this.router.currentRoute.value.params;
    if (conversationId) {
      await this.store.dispatch('setConversationLastMessageId', {
        conversationId: Number(conversationId),
      });
    }
  };

  onDisconnect = () => {
    this.disconnectTime = new Date();
    this.setConversationLastMessageId();
  };

  // Real websocket reconnect: always runs the full refresh, bypassing the
  // dedupe window. Only a second reconnect while one is in flight reuses it.
  onReconnect = async () => {
    // A billing change while the cable was down loses its account.billing_updated
    // broadcast, and the focus listener never fires if the tab stayed focused.
    await this.store.dispatch('accounts/get', { silent: true });
    this.reconnectRefresh ??= this.runRefresh().finally(() => {
      this.reconnectRefresh = null;
    });
    await this.reconnectRefresh;
    emitter.emit(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED);
  };
}

export default ReconnectService;
