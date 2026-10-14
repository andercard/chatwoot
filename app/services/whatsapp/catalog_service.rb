class Whatsapp::CatalogService
  PRODUCT_FIELDS = 'retailer_id,name,description,price,image_url,additional_image_urls,url'.freeze
  PAGE_SIZE = 100
  CACHE_TTL = 5.minutes
  PERMISSION_ERROR_CODE = 200

  class ApiError < StandardError
    attr_reader :permission

    def initialize(message, permission: false)
      super(message)
      @permission = permission
    end
  end

  pattr_initialize [:channel!]

  def perform
    catalog_id = resolve_catalog_id
    return { status: 'no_catalog' } if catalog_id.blank?

    Rails.cache.fetch("whatsapp_catalog/#{channel.id}/#{catalog_id}", expires_in: CACHE_TTL) do
      { status: 'ok', catalog_id: catalog_id, collections: build_collections(catalog_id) }
    end
  rescue ApiError => e
    Rails.logger.warn "[WHATSAPP CATALOG] channel=#{channel.id} #{e.message}"
    { status: e.permission ? 'missing_permission' : 'error' }
  rescue StandardError => e
    Rails.logger.warn "[WHATSAPP CATALOG] channel=#{channel.id} #{e.class}: #{e.message}"
    { status: 'error' }
  end

  private

  def resolve_catalog_id
    channel.provider_config['catalog_id'].presence || graph_get("#{channel.provider_config['business_account_id']}/product_catalogs").first&.dig('id')
  end

  def build_collections(catalog_id)
    seen = Set.new
    collections = graph_get("#{catalog_id}/product_sets", fields: 'id,name').map do |set|
      products = fetch_products(set['id'])
      seen.merge(products.pluck(:retailer_id))
      { id: set['id'], name: set['name'], products: products }
    end
    uncollected = fetch_products(catalog_id).reject { |product| seen.include?(product[:retailer_id]) }
    collections << { id: nil, name: nil, products: uncollected } if uncollected.present?
    collections
  end

  def fetch_products(node_id)
    graph_get("#{node_id}/products", fields: PRODUCT_FIELDS).map do |product|
      {
        retailer_id: product['retailer_id'],
        name: product['name'],
        price: product['price'],
        image_urls: [product['image_url'], *product['additional_image_urls']].compact,
        description: product['description'],
        url: product['url']
      }
    end
  end

  # Follows Graph cursors and returns the concatenated `data` of every page.
  def graph_get(path, query = {})
    items = []
    after = nil
    loop do
      body = request(path, query.merge(limit: PAGE_SIZE, after: after).compact)
      items.concat(body['data'] || [])
      after = body.dig('paging', 'next') && body.dig('paging', 'cursors', 'after')
      break if after.blank?
    end
    items
  end

  def request(path, query)
    response = HTTParty.get("#{base_url}/#{path}", query: query, headers: { 'Authorization' => "Bearer #{channel.template_access_token}" })
    body = response.parsed_response
    return body if response.success?

    error = body.is_a?(Hash) ? body['error'] || {} : {}
    permission = error['code'] == PERMISSION_ERROR_CODE || error['message'].to_s.match?(/permission/i)
    raise ApiError.new("HTTP #{response.code} code=#{error['code']} #{error['message']}", permission: permission)
  end

  def base_url
    "#{ENV.fetch('WHATSAPP_CLOUD_BASE_URL', 'https://graph.facebook.com')}/#{GlobalConfigService.load('WHATSAPP_API_VERSION', 'v22.0')}"
  end
end
