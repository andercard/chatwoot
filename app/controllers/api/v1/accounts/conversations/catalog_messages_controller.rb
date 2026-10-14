class Api::V1::Accounts::Conversations::CatalogMessagesController < Api::V1::Accounts::Conversations::BaseController
  PRODUCT_PARAMS = [:retailer_id, :name, :price, :description, :url, :section, { image_urls: [] }].freeze

  before_action :ensure_catalog_available

  def create
    @message = Whatsapp::CatalogMessageService.new(conversation: @conversation, sender: Current.user, params: catalog_params).perform
    render 'api/v1/accounts/conversations/messages/create'
  rescue Whatsapp::CatalogMessagePayloadBuilder::Error => e
    render_could_not_create_error(e.message)
  end

  private

  def channel
    @conversation.inbox.channel
  end

  def ensure_catalog_available
    return render_could_not_create_error('Catalog messages require a WhatsApp Cloud inbox') unless whatsapp_cloud_channel?

    configured_catalog_id = channel.provider_config['catalog_id']
    return if configured_catalog_id.blank? || configured_catalog_id == params[:catalog_id]

    render_could_not_create_error('Catalog ID does not match the inbox catalog')
  end

  def whatsapp_cloud_channel?
    channel.is_a?(Channel::Whatsapp) && channel.provider == 'whatsapp_cloud'
  end

  def catalog_params
    params.permit(:kind, :content, :header, :footer, :catalog_id, products: PRODUCT_PARAMS).to_h
  end
end
