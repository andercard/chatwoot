require 'rails_helper'

RSpec.describe Whatsapp::LocationMessageService do
  subject(:message) { described_class.new(conversation: conversation, sender: agent, params: params).perform }

  let(:whatsapp_channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false)
  end
  let(:inbox) { whatsapp_channel.inbox }
  let(:conversation) { create(:conversation, account: inbox.account, inbox: inbox) }
  let(:agent) { create(:user, account: inbox.account, role: :agent) }
  let(:saved_location) do
    { 'id' => 'loc-1', 'name' => 'Main Store', 'address' => '1 Main St', 'latitude' => 4.711, 'longitude' => -74.072 }
  end

  before do
    allow(conversation).to receive(:can_reply?).and_return(true)
    create(:inbox_member, inbox: inbox, user: agent)
    whatsapp_channel.update_column(:locations, [saved_location]) # rubocop:disable Rails/SkipsModelValidations
  end

  context 'with a saved location' do
    let(:params) { { location_id: 'loc-1' }.with_indifferent_access }

    it 'stores the channel location, ignoring client data' do
      expect(message).to be_outgoing
      expect(message.content).to eq("Main Store\n1 Main St")
      expect(message.content_attributes['whatsapp_location']).to eq(saved_location)
    end
  end

  context 'with the current location' do
    let(:params) { { latitude: '4.5', longitude: '-74.1' }.with_indifferent_access }

    it 'stores only the coordinates' do
      expect(message.content).to eq("Current location\n4.5, -74.1")
      expect(message.content_attributes['whatsapp_location']).to eq('latitude' => 4.5, 'longitude' => -74.1)
    end
  end

  context 'with an unknown location id' do
    let(:params) { { location_id: 'missing' }.with_indifferent_access }

    it 'raises an error' do
      expect { message }.to raise_error(described_class::Error, 'Location not found')
    end
  end

  context 'with out of range coordinates' do
    let(:params) { { latitude: '91', longitude: '10' }.with_indifferent_access }

    it 'raises an error' do
      expect { message }.to raise_error(described_class::Error)
    end
  end

  context 'with both modes' do
    let(:params) { { location_id: 'loc-1', latitude: '4.5', longitude: '-74.1' }.with_indifferent_access }

    it 'raises an error' do
      expect { message }.to raise_error(described_class::Error)
    end
  end

  context 'when the conversation is outside the reply window' do
    let(:params) { { location_id: 'loc-1' }.with_indifferent_access }

    before { allow(conversation).to receive(:can_reply?).and_return(false) }

    it 'raises an error without creating a message' do
      expect { message }.to raise_error(described_class::Error, /24-hour/)
      expect(conversation.messages.count).to eq(0)
    end
  end
end
