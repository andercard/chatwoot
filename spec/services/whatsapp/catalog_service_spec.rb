require 'rails_helper'

describe Whatsapp::CatalogService do
  subject(:result) { described_class.new(channel: channel).perform }

  let(:graph) { 'https://graph.facebook.com/v22.0' }
  let(:channel) do
    create(:channel_whatsapp, provider: 'whatsapp_cloud', sync_templates: false, validate_provider_config: false)
  end
  let(:fields) { 'retailer_id,name,description,price,image_url,additional_image_urls,url,product_sets{id,name}' }
  let(:all_products) { { 'id' => 'set_all', 'name' => 'All Products' } }
  let(:product_a) do
    { 'retailer_id' => 'a', 'name' => 'A', 'price' => '$ 5.000', 'image_url' => 'https://img/a.jpg',
      'additional_image_urls' => ['https://img/a2.jpg'], 'description' => 'da', 'url' => 'https://shop/a',
      'product_sets' => { 'data' => [all_products, { 'id' => 'set_1', 'name' => 'Set 1' }, { 'id' => 'set_2', 'name' => 'Set 2' }] } }
  end
  let(:product_b) do
    { 'retailer_id' => 'b', 'name' => 'B', 'price' => '$ 1.000', 'image_url' => 'https://img/b.jpg',
      'product_sets' => { 'data' => [all_products, { 'id' => 'set_2', 'name' => 'Set 2' }] } }
  end
  let(:product_c) { { 'retailer_id' => 'c', 'name' => 'C', 'price' => '$ 2.000' } }

  def stub_graph(path, body, query: {}, status: 200)
    stub_request(:get, "#{graph}/#{path}").with(query: hash_including(query.merge('limit' => '100')))
                                          .to_return(status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  context 'when the catalog is discovered from the WABA' do
    before do
      stub_graph('123456789/product_catalogs', { data: [{ 'id' => 'cat_1', 'name' => 'Shop' }] })
      stub_graph('cat_1/products', { data: [product_a, product_b, product_c] }, query: { 'fields' => fields })
    end

    it 'reads the catalog in one call per resource' do
      expect(result[:status]).to eq('ok')
      expect(result[:catalog_id]).to eq('cat_1')
      expect(a_request(:get, /product_catalogs/)).to have_been_made.once
      expect(a_request(:get, %r{cat_1/products})).to have_been_made.once
      expect(a_request(:get, %r{/product_sets})).not_to have_been_made
    end

    it 'returns each product once with its collection ids' do
      expect(result[:products].pluck(:retailer_id)).to eq(%w[a b c])
      expect(result[:products].first).to eq(
        retailer_id: 'a', name: 'A', price: '$ 5.000', image_urls: ['https://img/a.jpg', 'https://img/a2.jpg'],
        description: 'da', url: 'https://shop/a', collection_ids: %w[set_1 set_2]
      )
      expect(result[:products].second[:collection_ids]).to eq(['set_2'])
      expect(result[:products].last).to include(collection_ids: [], image_urls: [], description: nil, url: nil)
    end

    it 'excludes All Products and counts products per collection' do
      expect(result[:collections]).to eq(
        [{ id: 'set_1', name: 'Set 1', count: 1 }, { id: 'set_2', name: 'Set 2', count: 2 }]
      )
    end

    context 'with a cache store' do
      before { allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new) }

      it 'caches ok results and the catalog id' do
        2.times { described_class.new(channel: channel).perform }

        expect(a_request(:get, %r{cat_1/products})).to have_been_made.once
        expect(a_request(:get, /product_catalogs/)).to have_been_made.once
      end

      it 'bypasses and rewrites both caches on refresh' do
        described_class.new(channel: channel).perform
        described_class.new(channel: channel, refresh: '1').perform
        described_class.new(channel: channel).perform

        expect(a_request(:get, %r{cat_1/products})).to have_been_made.twice
        expect(a_request(:get, /product_catalogs/)).to have_been_made.twice
      end

      it 'does not cache errors' do
        stub_graph('cat_1/products', { error: { code: 1, message: 'boom' } }, status: 500)
        2.times { described_class.new(channel: channel).perform }

        expect(a_request(:get, %r{cat_1/products})).to have_been_made.twice
      end
    end
  end

  context 'when catalog_id is configured' do
    before { channel.update!(provider_config: channel.provider_config.merge('catalog_id' => 'cat_9')) }

    it 'skips the product_catalogs lookup' do
      stub_graph('cat_9/products', { data: [product_c] })

      expect(result[:catalog_id]).to eq('cat_9')
      expect(a_request(:get, /product_catalogs/)).not_to have_been_made
    end
  end

  context 'when there are more product pages' do
    let(:full_page) { Array.new(100) { |i| { 'retailer_id' => "p#{i}", 'name' => 'P' } } }

    before { channel.update!(provider_config: channel.provider_config.merge('catalog_id' => 'cat_9')) }

    it 'follows the cursor while pages are full' do
      stub_request(:get, "#{graph}/cat_9/products").with(query: hash_excluding('after'))
                                                   .to_return(body: { data: full_page, paging: { cursors: { after: 'c1' }, next: 'x' } }.to_json,
                                                              headers: { 'Content-Type' => 'application/json' })
      stub_request(:get, "#{graph}/cat_9/products").with(query: hash_including('after' => 'c1'))
                                                   .to_return(body: { data: [product_c], paging: { cursors: { after: 'c2' }, next: 'y' } }.to_json,
                                                              headers: { 'Content-Type' => 'application/json' })

      expect(result[:products].size).to eq(101)
      expect(a_request(:get, %r{cat_9/products})).to have_been_made.twice
    end
  end

  context 'when the WABA has no catalog' do
    it 'returns no_catalog' do
      stub_graph('123456789/product_catalogs', { data: [] })

      expect(result).to eq(status: 'no_catalog')
    end
  end

  context 'when Meta denies permission' do
    it 'returns missing_permission' do
      stub_graph('123456789/product_catalogs', { error: { code: 200, message: 'Permissions error' } }, status: 403)

      expect(result).to eq(status: 'missing_permission')
    end
  end

  context 'when Meta fails otherwise' do
    it 'returns error' do
      stub_graph('123456789/product_catalogs', { error: { code: 1, message: 'boom' } }, status: 500)

      expect(result).to eq(status: 'error')
    end
  end
end
