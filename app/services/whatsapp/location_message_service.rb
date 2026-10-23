class Whatsapp::LocationMessageService
  class Error < StandardError; end

  pattr_initialize [:conversation!, :sender!, :params!]

  def perform
    location = params[:location_id].present? ? saved_location : current_location
    content = location_content(location)

    Messages::MessageBuilder.new(sender, conversation, content: content, content_attributes: { whatsapp_location: location }).perform
  end

  private

  def saved_location
    raise Error, I18n.t('errors.whatsapp.location.single_mode_required') if params[:latitude].present? || params[:longitude].present?

    found = conversation.inbox.channel.locations.find { |location| location['id'] == params[:location_id] }
    raise Error, I18n.t('errors.whatsapp.location.not_found') if found.nil?

    found.slice('id', 'name', 'address', 'latitude', 'longitude')
  end

  def current_location
    latitude = coordinate(params[:latitude], 90)
    longitude = coordinate(params[:longitude], 180)

    { 'latitude' => latitude, 'longitude' => longitude }
  end

  def coordinate(value, limit)
    number = Float(value, exception: false)
    raise Error, I18n.t('errors.whatsapp.location.invalid_coordinates') if number.nil? || !number.between?(-limit, limit)

    number
  end

  def location_content(location)
    return [location['name'], location['address']].compact_blank.join("\n") if location['name'].present?

    "#{I18n.t('errors.whatsapp.location.current_location')}\n#{location['latitude']}, #{location['longitude']}"
  end
end
