class Whatsapp::CatalogMessagePayloadBuilder
  class Error < StandardError; end

  ITEM_LIMITS = {
    'carousel' => 2..10,
    'product' => 1..1,
    'product_list' => 1..30
  }.freeze

  pattr_initialize [:body!, :catalog!]

  def perform
    validate!
    send("#{kind}_payload")
  end

  private

  def kind
    catalog['kind']
  end

  def items
    catalog['items'].to_a
  end

  def validate!
    raise Error, "Unsupported catalog message kind: #{kind.inspect}" unless ITEM_LIMITS.key?(kind)

    validate_products!
    validate_texts!
  end

  def validate_products!
    limit = ITEM_LIMITS[kind]
    raise Error, 'Catalog ID is required' if catalog['catalog_id'].blank?
    raise Error, "#{kind} requires between #{limit.min} and #{limit.max} products" unless limit.cover?(items.size)
    raise Error, 'Every product requires a retailer ID (SKU)' if items.any? { |item| item['retailer_id'].blank? }
  end

  def validate_texts!
    raise Error, "#{kind} requires a body" if kind != 'product' && body.blank?
    raise Error, 'product_list requires a header' if kind == 'product_list' && catalog['header'].blank?
  end

  def carousel_payload
    {
      type: 'carousel',
      body: { text: body },
      action: {
        cards: items.each_with_index.map do |item, index|
          {
            card_index: index,
            type: 'product',
            action: { product_retailer_id: item['retailer_id'], catalog_id: catalog['catalog_id'] }
          }
        end
      }
    }
  end

  def product_payload
    payload = { type: 'product' }
    payload[:body] = { text: body } if body.present?
    payload[:footer] = { text: catalog['footer'] } if catalog['footer'].present?
    payload.merge(action: { catalog_id: catalog['catalog_id'], product_retailer_id: items.first['retailer_id'] })
  end

  def product_list_payload
    payload = { type: 'product_list', header: { type: 'text', text: catalog['header'] }, body: { text: body } }
    payload[:footer] = { text: catalog['footer'] } if catalog['footer'].present?
    payload.merge(action: { catalog_id: catalog['catalog_id'], sections: sections })
  end

  def sections
    items.group_by { |item| item['section'] }.map do |title, section_items|
      { title: title, product_items: section_items.map { |item| { product_retailer_id: item['retailer_id'] } } }
    end
  end
end
