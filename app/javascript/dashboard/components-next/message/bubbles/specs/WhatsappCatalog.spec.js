import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import WhatsappCatalog from '../WhatsappCatalog.vue';
import { provideMessageContext } from '../../provider.js';

const items = [
  {
    retailerId: 'a',
    name: 'Mug',
    price: '$ 5.000',
    imageUrls: ['https://x/1.jpg', 'https://x/2.jpg'],
    description: 'Ceramic mug',
    url: 'https://x/mug',
    section: 'Kitchen',
  },
  {
    retailerId: 'b',
    name: 'Plate',
    price: '$ 7.000',
    imageUrls: [],
    description: null,
    url: null,
    section: 'Kitchen',
  },
];

const mountCatalog = (kind, catalogItems = items) => {
  const TestHost = defineComponent({
    components: { WhatsappCatalog },
    setup() {
      provideMessageContext({
        content: ref('Body text'),
        contentAttributes: ref({
          whatsappCatalog: {
            kind,
            catalogId: '1',
            header: 'Head',
            footer: 'Foot',
            items: catalogItems,
          },
        }),
      });
    },
    template: '<WhatsappCatalog />',
  });

  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        CATALOG: {
          PRODUCT: {
            VIEW: 'View',
            VIEW_ITEMS: 'View items',
            ITEMS_COUNT: '{count} items',
            DESCRIPTION: 'Description',
            LINK: 'Link',
            PHOTO_OF: '{current} of {total}',
          },
          NO_COLLECTION: 'Collection',
          ACTIONS: { CLOSE: 'Close' },
        },
      },
    },
  });

  return mount(TestHost, {
    attachTo: document.body,
    global: {
      plugins: [i18n],
      stubs: { BaseBubble: { template: '<div><slot /></div>' } },
    },
  });
};

describe('WhatsappCatalog', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a carousel and opens the detail without an order button', async () => {
    const wrapper = mountCatalog('carousel');
    expect(wrapper.text()).toContain('Body text');
    expect(wrapper.text()).toContain('Foot');
    expect(wrapper.findAll('[data-test-id="catalog-card"]')).toHaveLength(2);

    await wrapper
      .find('[data-test-id="catalog-card"] button + div + button')
      .trigger('click');
    const detail = document.body.querySelector(
      '[data-test-id="catalog-detail"]'
    );
    expect(detail.textContent).toContain('Mug');
    expect(detail.textContent).toContain('$ 5.000');
    expect(detail.textContent).toContain('Ceramic mug');
    expect(detail.textContent).toContain('1 of 2');
    expect(detail.querySelector('video')).toBeNull();
    expect(detail.textContent).not.toMatch(/cart|order/i);
    wrapper.unmount();
  });

  it('renders a single product card', () => {
    const wrapper = mountCatalog('product', [items[0]]);
    expect(wrapper.findAll('[data-test-id="catalog-card"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('View');
    wrapper.unmount();
  });

  it('renders a product list with count and opens list then detail', async () => {
    const wrapper = mountCatalog('product_list');
    expect(wrapper.text()).toContain('Kitchen');
    expect(wrapper.text()).toContain('2 items');
    expect(wrapper.text()).toContain('View items');

    await wrapper.find('[data-test-id="catalog-list-header"]').trigger('click');
    const rows = document.body.querySelectorAll(
      '[data-test-id="catalog-list-row"]'
    );
    expect(rows).toHaveLength(2);
    rows[1].click();
    await wrapper.vm.$nextTick();
    expect(
      document.body.querySelector('[data-test-id="catalog-detail"]').textContent
    ).toContain('Plate');
    wrapper.unmount();
  });
});
