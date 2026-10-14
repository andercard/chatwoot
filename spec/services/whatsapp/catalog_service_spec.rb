require 'rails_helper'

describe Whatsapp::CatalogService do
  subject(:result) { described_class.new(channel: channel).perform }

  let(:graph) { 'https://graph.facebook.com/v22.0' }
  let(:channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false)
  end
  let(:fields) { 'retailer_id,name,description,price,image_url,additional_image_urls,url' }
  let(:product_a) do
    { 'retailer_id' => 'a', 'name' => 'A', 'price' => '$ 5.000', 'image_url' => 'https://img/a.jpg',
      'additional_image_urls' => ['https://img/a2.jpg'], 'description' => 'da', 'url' => 'https://shop/a' }
  end
  let(:product_b) { { 'retailer_id' => 'b', 'name' => 'B', 'price' => '$ 1.000', 'image_url' => 'https://img/b.jpg' } }

  def stub_graph(path, query, body, status: 200)
    stub_request(:get, "#{graph}/#{path}").with(query: hash_including(query.merge('limit' => '100')))
                                          .to_return(status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  context 'when the catalog is discovered from the WABA' do
    before do
      stub_graph('123456789/product_catalogs', {}, { data: [{ 'id' => 'cat_1', 'name' => 'Shop' }] })
      stub_graph('cat_1/product_sets', { 'fields' => 'id,name' }, { data: [{ 'id' => 'set_1', 'name' => 'Set 1' }] })
      stub_graph('set_1/products', { 'fields' => fields }, { data: [product_a] })
      stub_graph('cat_1/products', { 'fields' => fields }, { data: [product_a, product_b] })
    end

    it 'returns collections plus an uncollected bucket' do
      expect(result[:status]).to eq('ok')
      expect(result[:catalog_id]).to eq('cat_1')
      expect(result[:collections].pluck(:id)).to eq(['set_1', nil])
      expect(result[:collections].first[:products].first).to eq(
        retailer_id: 'a', name: 'A', price: '$ 5.000', image_urls: ['https://img/a.jpg', 'https://img/a2.jpg'],
        description: 'da', url: 'https://shop/a'
      )
      expect(result[:collections].last[:products].pluck(:retailer_id)).to eq(['b'])
      expect(result[:collections].last[:products].first[:image_urls]).to eq(['https://img/b.jpg'])
    end

    it 'caches ok results' do
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      described_class.new(channel: channel).perform
      described_class.new(channel: channel).perform

      expect(a_request(:get, "#{graph}/cat_1/product_sets").with(query: hash_including('fields' => 'id,name'))).to have_been_made.once
    end
  end

  context 'when catalog_id is configured' do
    before { channel.update!(provider_config: channel.provider_config.merge('catalog_id' => 'cat_9')) }

    it 'skips the product_catalogs lookup' do
      stub_graph('cat_9/product_sets', {}, { data: [] })
      stub_graph('cat_9/products', {}, { data: [product_b] })

      expect(result[:catalog_id]).to eq('cat_9')
      expect(a_request(:get, /product_catalogs/)).not_to have_been_made
    end
  end

  context 'when there are more product pages' do
    before { channel.update!(provider_config: channel.provider_config.merge('catalog_id' => 'cat_9')) }

    it 'follows the cursor' do
      stub_graph('cat_9/product_sets', {}, { data: [] })
      stub_request(:get, "#{graph}/cat_9/products").with(query: hash_excluding('after'))
                                                   .to_return(body: { data: [product_a], paging: { cursors: { after: 'c1' }, next: 'x' } }.to_json,
                                                              headers: { 'Content-Type' => 'application/json' })
      stub_request(:get, "#{graph}/cat_9/products").with(query: hash_including('after' => 'c1'))
                                                   .to_return(body: { data: [product_b] }.to_json, headers: { 'Content-Type' => 'application/json' })

      expect(result[:collections].first[:products].pluck(:retailer_id)).to eq(%w[a b])
    end
  end

  context 'when the WABA has no catalog' do
    it 'returns no_catalog' do
      stub_graph('123456789/product_catalogs', {}, { data: [] })

      expect(result).to eq(status: 'no_catalog')
    end
  end

  context 'when Meta denies permission' do
    it 'returns missing_permission' do
      stub_graph('123456789/product_catalogs', {}, { error: { code: 200, message: 'Permissions error' } }, status: 403)

      expect(result).to eq(status: 'missing_permission')
    end
  end

  context 'when Meta fails otherwise' do
    it 'returns error' do
      stub_graph('123456789/product_catalogs', {}, { error: { code: 1, message: 'boom' } }, status: 500)

      expect(result).to eq(status: 'error')
    end
  end
end
