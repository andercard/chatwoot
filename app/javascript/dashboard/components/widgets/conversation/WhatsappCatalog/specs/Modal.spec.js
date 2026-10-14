import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import Modal from '../Modal.vue';
import { loadCatalog } from 'dashboard/helper/whatsappCatalogCache';
import whatsappCatalogMessages from 'dashboard/api/whatsappCatalogMessages';

vi.mock('dashboard/helper/whatsappCatalogCache', () => ({
  loadCatalog: vi.fn(),
}));
vi.mock('dashboard/api/whatsappCatalogMessages', () => ({
  default: { create: vi.fn() },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: key => key }) }));
vi.mock('dashboard/composables/useAdmin', () => ({
  useAdmin: () => ({ isAdmin: ref(true) }),
}));

const catalogData = (status = 'ok') => ({
  status,
  catalog_id: 'cat-1',
  collections: [
    { id: 'c1', name: 'Summer', count: 2 },
    { id: 'c2', name: 'Sale', count: 1 },
  ],
  products: [
    {
      retailer_id: 'sku-0',
      name: 'Red Shirt',
      price: '$1',
      image_urls: ['a.jpg'],
      description: 'Soft cotton',
      url: 'https://x.test/0',
      collection_ids: ['c1', 'c2'],
    },
    {
      retailer_id: 'sku-1',
      name: 'Blue Hat',
      price: '$2',
      image_urls: [],
      description: null,
      url: null,
      collection_ids: ['c1'],
    },
    {
      retailer_id: 'sku-2',
      name: 'Green Sock',
      price: '$3',
      image_urls: [],
      description: null,
      url: null,
      collection_ids: [],
    },
  ],
});

const ButtonStub = {
  props: ['label', 'disabled'],
  template: '<button :disabled="disabled">{{ label }}</button>',
};

const mountModal = async (props = {}) => {
  const w = mount(Modal, {
    props: { show: true, inboxId: 1, conversationId: 9, ...props },
    global: {
      mocks: { $t: key => key },
      stubs: {
        Teleport: true,
        Button: ButtonStub,
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  });
  await flushPromises();
  return w;
};

const q = (w, id) => w.find(`[data-testid="${id}"]`);
const rows = w => w.findAll('[data-testid="catalog-product-row"]');

describe('WhatsappCatalog Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCatalog.mockResolvedValue(catalogData());
  });

  it('opens on the products view with every product once', async () => {
    const w = await mountModal();
    expect(q(w, 'catalog-search').exists()).toBe(true);
    expect(q(w, 'catalog-chip-all').exists()).toBe(true);
    expect(q(w, 'catalog-chip-c2').exists()).toBe(true);
    expect(rows(w)).toHaveLength(3);
    expect(w.text().match(/Red Shirt/g)).toHaveLength(1);
    expect(loadCatalog).toHaveBeenCalledWith(1, { force: false });
  });

  it('filters the list with the search box', async () => {
    const w = await mountModal();
    await q(w, 'catalog-search').setValue('hat');
    expect(rows(w)).toHaveLength(1);
    expect(w.text()).toContain('Blue Hat');
    await q(w, 'catalog-search').setValue('zzz');
    expect(q(w, 'catalog-no-results').exists()).toBe(true);
  });

  it('opens the detail with See more', async () => {
    const w = await mountModal();
    await rows(w)[0].find('[data-testid="catalog-see-more"]').trigger('click');
    const detail = w.find('[data-test-id="catalog-detail"]');
    expect(detail.exists()).toBe(true);
    expect(detail.text()).toContain('Red Shirt');
  });

  it('renders refresh and close as icon-only buttons', async () => {
    const w = await mountModal();
    expect(q(w, 'catalog-refresh').text()).toBe('');
    expect(q(w, 'catalog-refresh').attributes('aria-label')).toBe(
      'CATALOG.ACTIONS.REFRESH'
    );
    expect(q(w, 'catalog-close').text()).toBe('');
    expect(q(w, 'catalog-close').attributes('aria-label')).toBe(
      'CATALOG.ACTIONS.CLOSE'
    );
    expect(q(w, 'catalog-counter').exists()).toBe(false);
  });

  it('forces a reload with Refresh', async () => {
    const w = await mountModal();
    await q(w, 'catalog-refresh').trigger('click');
    expect(loadCatalog).toHaveBeenLastCalledWith(1, { force: true });
  });

  it('disables the carousel with one product and keeps the list', async () => {
    const w = await mountModal();
    expect(q(w, 'catalog-next').exists()).toBe(false);
    await q(w, 'catalog-select').trigger('click');
    expect(q(w, 'catalog-next').element.disabled).toBe(true);
    await rows(w)[0].trigger('click');
    expect(q(w, 'catalog-counter').text()).toContain('CATALOG.COUNTER');
    expect(w.find('footer').text()).not.toContain('CATALOG.COUNTER');
    expect(
      w.find('header').find('[data-testid="catalog-counter"]').exists()
    ).toBe(true);
    expect(q(w, 'catalog-cancel-selection').text()).toBe(
      'CATALOG.ACTIONS.CANCEL'
    );
    expect(q(w, 'catalog-next').text()).toBe('CATALOG.ACTIONS.NEXT');
    await q(w, 'catalog-next').trigger('click');
    expect(q(w, 'catalog-format-carousel').element.disabled).toBe(true);
    expect(q(w, 'catalog-format-product_list').element.disabled).toBe(false);
    expect(q(w, 'catalog-format-reason-carousel').exists()).toBe(true);
    expect(q(w, 'catalog-back-link').exists()).toBe(false);
    await q(w, 'catalog-back').trigger('click');
    expect(rows(w)[0].find('input').element.checked).toBe(true);
  });

  it('requires header and body for a list', async () => {
    const w = await mountModal();
    await q(w, 'catalog-select').trigger('click');
    await rows(w)[0].trigger('click');
    await q(w, 'catalog-next').trigger('click');
    await q(w, 'catalog-format-product_list').setValue(true);
    await q(w, 'catalog-field-header').setValue('');
    await q(w, 'catalog-send').trigger('click');
    expect(whatsappCatalogMessages.create).not.toHaveBeenCalled();
    expect(w.text()).toContain('CATALOG.ERRORS.REQUIRED');
  });

  it('sends the expected payload and emits sent', async () => {
    whatsappCatalogMessages.create.mockResolvedValue({});
    const w = await mountModal({ initialBody: 'Hola' });
    await q(w, 'catalog-select').trigger('click');
    await rows(w)[0].trigger('click');
    await rows(w)[2].trigger('click');
    await q(w, 'catalog-next').trigger('click');
    await q(w, 'catalog-format-product_list').setValue(true);
    expect(q(w, 'catalog-field-header').element.value).toBe('Summer');
    await q(w, 'catalog-send').trigger('click');
    await flushPromises();
    expect(whatsappCatalogMessages.create).toHaveBeenCalledWith(9, {
      kind: 'product_list',
      content: 'Hola',
      header: 'Summer',
      footer: '',
      catalog_id: 'cat-1',
      products: [
        {
          retailer_id: 'sku-0',
          name: 'Red Shirt',
          price: '$1',
          description: 'Soft cotton',
          url: 'https://x.test/0',
          section: 'Summer',
          image_urls: ['a.jpg'],
        },
        {
          retailer_id: 'sku-2',
          name: 'Green Sock',
          price: '$3',
          description: null,
          url: null,
          section: 'CATALOG.NO_COLLECTION',
          image_urls: [],
        },
      ],
    });
    expect(w.emitted('sent')).toBeTruthy();
    expect(w.emitted('close')).toBeTruthy();
  });

  it('shows the setup guide for no_catalog', async () => {
    loadCatalog.mockResolvedValue({
      status: 'no_catalog',
      collections: [],
      products: [],
    });
    const w = await mountModal();
    expect(q(w, 'catalog-setup-guide').exists()).toBe(true);
    expect(q(w, 'catalog-search').exists()).toBe(false);
  });
});
