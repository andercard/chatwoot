class Whatsapp::Providers::WhatsappCloudLocationService < Whatsapp::Providers::BaseService
  API_VERSION = 'v24.0'.freeze

  def self.perform(whatsapp_channel, identifier, message)
    new(whatsapp_channel: whatsapp_channel).perform(identifier, message)
  end

  def perform(identifier, message)
    location = message.content_attributes['whatsapp_location']
    reply_to = message.content_attributes[:in_reply_to_external_id]
    response = HTTParty.post(
      "#{phone_id_path}/messages",
      headers: api_headers,
      body: {
        messaging_product: 'whatsapp',
        context: reply_to.present? ? { message_id: reply_to } : nil,
        **recipient_params(identifier),
        type: 'location',
        location: location.slice('latitude', 'longitude', 'name', 'address').compact_blank
      }.to_json
    )

    process_response(response, message)
  end

  private

  def phone_id_path
    base_url = ENV.fetch('WHATSAPP_CLOUD_BASE_URL', 'https://graph.facebook.com')
    "#{base_url}/#{API_VERSION}/#{whatsapp_channel.provider_config['phone_number_id']}"
  end

  def api_headers
    { 'Authorization' => "Bearer #{whatsapp_channel.provider_config['api_key']}", 'Content-Type' => 'application/json' }
  end

  def error_message(response)
    response.parsed_response.dig('error', 'message') if response.parsed_response.is_a?(Hash)
  end
end
