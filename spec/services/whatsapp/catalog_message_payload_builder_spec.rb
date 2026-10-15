require 'rails_helper'

describe Whatsapp::CatalogMessagePayloadBuilder do
  subject(:payload) { described_class.new(body: body, catalog: catalog).perform }

  let(:body) { 'Mira estas opciones' }
  let(:kind) { 'carousel' }
  let(:header) { nil }
  let(:footer) { nil }
  let(:items) do
    [
      { 'retailer_id' => 'sku-a', 'name' => 'Producto A', 'section' => 'Cuadros' },
      { 'retailer_id' => 'sku-b', 'name' => 'Producto B', 'section' => 'Marcos' },
      { 'retailer_id' => 'sku-c', 'name' => 'Producto C', 'section' => 'Cuadros' }
    ]
  end
  let(:catalog) { { 'kind' => kind, 'catalog_id' => 'cat-123', 'header' => header, 'footer' => footer, 'items' => items } }

  describe 'carousel' do
    it 'builds one product card per item without header or footer' do
      expect(payload).to eq(
        type: 'carousel',
        body: { text: 'Mira estas opciones' },
        action: {
          cards: [
            { card_index: 0, type: 'product', action: { product_retailer_id: 'sku-a', catalog_id: 'cat-123' } },
            { card_index: 1, type: 'product', action: { product_retailer_id: 'sku-b', catalog_id: 'cat-123' } },
            { card_index: 2, type: 'product', action: { product_retailer_id: 'sku-c', catalog_id: 'cat-123' } }
          ]
        }
      )
    end

    context 'when it has fewer than 2 products' do
      let(:items) { [{ 'retailer_id' => 'sku-a' }] }

      it { expect { payload }.to raise_error(described_class::Error, /between 2 and 10 products/) }
    end

    context 'when it has more than 10 products' do
      let(:items) { Array.new(11) { |i| { 'retailer_id' => "sku-#{i}" } } }

      it { expect { payload }.to raise_error(described_class::Error, /between 2 and 10 products/) }
    end

    context 'when the body is blank' do
      let(:body) { '' }

      it { expect { payload }.to raise_error(described_class::Error, /requires a body/) }
    end
  end

  describe 'product' do
    let(:kind) { 'product' }
    let(:items) { [{ 'retailer_id' => 'sku-a' }] }

    it 'builds a single product message without body or footer when absent' do
      expect(described_class.new(body: nil, catalog: catalog).perform).to eq(
        type: 'product',
        action: { catalog_id: 'cat-123', product_retailer_id: 'sku-a' }
      )
    end

    context 'when body and footer are present' do
      let(:footer) { 'Envío gratis' }

      it 'includes them' do
        expect(payload).to eq(
          type: 'product',
          body: { text: 'Mira estas opciones' },
          footer: { text: 'Envío gratis' },
          action: { catalog_id: 'cat-123', product_retailer_id: 'sku-a' }
        )
      end
    end

    context 'when it has more than one product' do
      let(:items) { [{ 'retailer_id' => 'sku-a' }, { 'retailer_id' => 'sku-b' }] }

      it { expect { payload }.to raise_error(described_class::Error, /between 1 and 1 products/) }
    end
  end

  describe 'product_list' do
    let(:kind) { 'product_list' }
    let(:header) { 'Nuestro catálogo' }

    it 'groups products by section keeping the order' do
      expect(payload).to eq(
        type: 'product_list',
        header: { type: 'text', text: 'Nuestro catálogo' },
        body: { text: 'Mira estas opciones' },
        action: {
          catalog_id: 'cat-123',
          sections: [
            { title: 'Cuadros', product_items: [{ product_retailer_id: 'sku-a' }, { product_retailer_id: 'sku-c' }] },
            { title: 'Marcos', product_items: [{ product_retailer_id: 'sku-b' }] }
          ]
        }
      )
    end

    context 'when a footer is present' do
      let(:footer) { 'Precios en COP' }

      it { expect(payload[:footer]).to eq(text: 'Precios en COP') }
    end

    context 'when it has more than 30 products' do
      let(:items) { Array.new(31) { |i| { 'retailer_id' => "sku-#{i}", 'section' => 'Todos' } } }

      it { expect { payload }.to raise_error(described_class::Error, /between 1 and 30 products/) }
    end

    context 'when the header is blank' do
      let(:header) { nil }

      it { expect { payload }.to raise_error(described_class::Error, /requires a header/) }
    end

    context 'when the body is blank' do
      let(:body) { nil }

      it { expect { payload }.to raise_error(described_class::Error, /requires a body/) }
    end
  end

  describe 'validation common to all formats' do
    context 'when the catalog ID is missing' do
      let(:catalog) { { 'kind' => 'carousel', 'items' => items } }

      it { expect { payload }.to raise_error(described_class::Error, /Catalog ID is required/) }
    end

    context 'when a product has no retailer ID' do
      let(:items) { [{ 'retailer_id' => 'sku-a' }, { 'retailer_id' => '' }] }

      it { expect { payload }.to raise_error(described_class::Error, /retailer ID/) }
    end

    context 'when the kind is unknown' do
      let(:kind) { 'grid' }

      it { expect { payload }.to raise_error(described_class::Error, /Unsupported catalog message kind/) }
    end
  end
end
