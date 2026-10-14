class Whatsapp::CatalogService
  PRODUCT_FIELDS = 'retailer_id,name,description,price,image_url,additional_image_urls,url,product_sets{id,name}'.freeze
  PAGE_SIZE = 100
  MAX_PAGES = 20
  CACHE_TTL = 15.minutes
  CATALOG_ID_CACHE_TTL = 24.hours
  DEFAULT_COLLECTION_NAME = 'all products'.freeze
  PERMISSION_ERROR_CODE = 200

  class ApiError < StandardError
    attr_reader :permission

    def initialize(message, permission: false)
      super(message)
      @permission = permission
    end
  end

  pattr_initialize [:channel!, :refresh]

  def perform
    catalog_id = resolve_catalog_id
    return { status: 'no_catalog' } if catalog_id.blank?

    Rails.cache.fetch("whatsapp_catalog/#{channel.id}/#{catalog_id}", expires_in: CACHE_TTL, force: refresh?) do
      build_catalog(catalog_id)
    end
  rescue ApiError => e
    Rails.logger.warn "[WHATSAPP CATALOG] channel=#{channel.id} #{e.message}"
    { status: e.permission ? 'missing_permission' : 'error' }
  rescue StandardError => e
    Rails.logger.warn "[WHATSAPP CATALOG] channel=#{channel.id} #{e.class}: #{e.message}"
    { status: 'error' }
  end

  private

  def refresh?
    %w[1 true].include?(refresh.to_s)
  end

  def resolve_catalog_id
    channel.provider_config['catalog_id'].presence ||
      Rails.cache.fetch("whatsapp_catalog_id/#{channel.id}", expires_in: CATALOG_ID_CACHE_TTL, force: refresh?, skip_nil: true) do
        request("#{channel.provider_config['business_account_id']}/product_catalogs", limit: PAGE_SIZE)['data']&.first&.dig('id')
      end
  end

  def build_catalog(catalog_id)
    collections = {}
    products = fetch_products(catalog_id).map do |product|
      sets = product.dig('product_sets', 'data').to_a.reject { |set| set['name'].to_s.casecmp?(DEFAULT_COLLECTION_NAME) }
      sets.each { |set| (collections[set['id']] ||= { id: set['id'], name: set['name'], count: 0 })[:count] += 1 }
      format_product(product, sets.pluck('id'))
    end
    { status: 'ok', catalog_id: catalog_id, collections: collections.values, products: products }
  end

  def format_product(product, collection_ids)
    {
      retailer_id: product['retailer_id'],
      name: product['name'],
      price: product['price'],
      image_urls: [product['image_url'], *product['additional_image_urls']].compact,
      description: product['description'],
      url: product['url'],
      collection_ids: collection_ids
    }
  end

  # Follows Graph cursors; stops on a short page or an empty one.
  def fetch_products(catalog_id)
    products = []
    after = nil
    MAX_PAGES.times do
      body = request("#{catalog_id}/products", { fields: PRODUCT_FIELDS, limit: PAGE_SIZE, after: after }.compact)
      page = body['data'].to_a
      products.concat(page)
      after = body.dig('paging', 'cursors', 'after')
      break if page.size < PAGE_SIZE || after.blank?
    end
    products
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
