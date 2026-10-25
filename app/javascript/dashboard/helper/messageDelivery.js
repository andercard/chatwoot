import { MESSAGE_STATUS } from 'shared/constants/messages';

export const MESSAGE_DELIVERY_TIMEOUT_MS = 60000;

export const MESSAGE_DELIVERY_RESULTS = {
  SENT: 'sent',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
};

// The provider accepting a message sets its source_id, and a rejection sets status failed.
// Both reach the store through the message.updated event.
export const waitForMessageDelivery = (
  store,
  { conversationId, messageId, timeoutMs = MESSAGE_DELIVERY_TIMEOUT_MS }
) =>
  new Promise(resolve => {
    const getResult = () => {
      const message = store.getters
        .getConversationById(conversationId)
        ?.messages.find(({ id }) => id === messageId);
      if (message?.status === MESSAGE_STATUS.FAILED) {
        return MESSAGE_DELIVERY_RESULTS.FAILED;
      }
      return !message || message.source_id
        ? MESSAGE_DELIVERY_RESULTS.SENT
        : null;
    };

    const current = getResult();
    if (current) {
      resolve(current);
      return;
    }

    let timer;
    const unwatch = store.watch(getResult, result => {
      if (!result) return;
      clearTimeout(timer);
      unwatch();
      resolve(result);
    });
    timer = setTimeout(() => {
      unwatch();
      resolve(MESSAGE_DELIVERY_RESULTS.TIMEOUT);
    }, timeoutMs);
  });
