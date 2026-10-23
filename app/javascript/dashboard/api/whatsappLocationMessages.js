/* global axios */
import ApiClient from './ApiClient';

class WhatsappLocationMessages extends ApiClient {
  constructor() {
    super('conversations', { accountScoped: true });
  }

  create(conversationId, payload) {
    return axios.post(
      `${this.url}/${conversationId}/location_message`,
      payload
    );
  }
}

export default new WhatsappLocationMessages();
