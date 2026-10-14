import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import Modal from '../Modal.vue';
import inboxesAPI from 'dashboard/api/inboxes';
import whatsappCatalogMessages from 'dashboard/api/whatsappCatalogMessages';

vi.mock('dashboard/api/inboxes', () => ({
  default: { getWhatsappCatalog: vi.fn() },
}));
vi.mock('dashboard/api/whatsappCatalogMessages', () => ({
  default: { create: vi.fn() },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: ref(true) }),
}));

const makeProducts = n =>
  Array.from({ length: n }, (_, i) => ({
    retailer_id: `sku-${i}`,
    name: `Product ${i}`,
    price: '$1',
    description: '',
    url: '',
    image_urls: [],
  }));

const catalogResponse = (n = 12) => ({
  data: {
    status: 'ok',
    catalog_id: 'cat-1',
    collections: [{ id: 'c1', name: 'Summer', products: makeProducts(n) }],
  },
});

const ButtonStub = {
  props: ['label', 'disabled'],
  template: '<button :disabled="disabled">{{ label }}</button>',
};

const mountModal = (props = {}) =>
  mount(Modal, {
    props: { show: true, inboxId: 1, conversationId: 9, ...props },
    global: {
      mocks: { $t: (key, params) => (params ? `${key}` : key) },
      stubs: {
        Teleport: true,
        Button: ButtonStub,
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  });

const q = (w, id) => w.find(`[data-testid="${id}"]`);

describe('WhatsappCatalog Modal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens on the format step', () => {
    const w = mountModal();
    expect(q(w, 'catalog-format-carousel').exists()).toBe(true);
    expect(inboxesAPI.getWhatsappCatalog).not.toHaveBeenCalled();
  });

  it('caps a carousel at 10 products', async () => {
    inboxesAPI.getWhatsappCatalog.mockResolvedValue(catalogResponse());
    const w = mountModal();
    await q(w, 'catalog-format-carousel').trigger('click');
    await flushPromises();
    const boxes = () => w.findAll('input[type="checkbox"]');
    for (let i = 0; i < 12; i += 1) {
      if (!boxes()[i].element.disabled) {
        // eslint-disable-next-line no-await-in-loop
        await boxes()[i].trigger('change');
      }
    }
    expect(boxes().filter(b => b.element.checked)).toHaveLength(10);
    expect(boxes()[10].element.disabled).toBe(true);
  });

  it('requires header and body for a list', async () => {
    inboxesAPI.getWhatsappCatalog.mockResolvedValue(catalogResponse(3));
    const w = mountModal();
    await q(w, 'catalog-format-product_list').trigger('click');
    await flushPromises();
    await w.find('input[type="checkbox"]').trigger('change');
    await q(w, 'catalog-next').trigger('click');
    await q(w, 'catalog-field-header').setValue('');
    await q(w, 'catalog-send').trigger('click');
    expect(whatsappCatalogMessages.create).not.toHaveBeenCalled();
    expect(w.text()).toContain('CATALOG.ERRORS.REQUIRED');
  });

  it('sends the expected payload and emits sent', async () => {
    inboxesAPI.getWhatsappCatalog.mockResolvedValue(catalogResponse(3));
    whatsappCatalogMessages.create.mockResolvedValue({});
    const w = mountModal({ initialBody: 'Hola' });
    await q(w, 'catalog-format-product').trigger('click');
    await flushPromises();
    await w.find('input').trigger('change');
    await q(w, 'catalog-next').trigger('click');
    expect(q(w, 'catalog-field-body').element.value).toBe('Hola');
    await q(w, 'catalog-send').trigger('click');
    await flushPromises();
    expect(whatsappCatalogMessages.create).toHaveBeenCalledWith(9, {
      kind: 'product',
      content: 'Hola',
      header: '',
      footer: '',
      catalog_id: 'cat-1',
      products: [
        {
          retailer_id: 'sku-0',
          name: 'Product 0',
          price: '$1',
          description: '',
          url: '',
          section: 'Summer',
          image_urls: [],
        },
      ],
    });
    expect(w.emitted('sent')).toBeTruthy();
    expect(w.emitted('close')).toBeTruthy();
  });

  it('shows the setup guide for no_catalog', async () => {
    inboxesAPI.getWhatsappCatalog.mockResolvedValue({
      data: { status: 'no_catalog', collections: [] },
    });
    const w = mountModal();
    await q(w, 'catalog-format-carousel').trigger('click');
    await flushPromises();
    expect(q(w, 'catalog-setup-guide').exists()).toBe(true);
    expect(w.text()).toContain('CATALOG.SETUP_GUIDE.NO_CATALOG.TITLE');
    expect(q(w, 'catalog-open-settings').exists()).toBe(true);
  });
});
