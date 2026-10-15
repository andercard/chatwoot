import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import CatalogSheet from '../CatalogSheet.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: { CATALOG: { ACTIONS: { CLOSE: 'Close' } } } },
});

const mountSheet = (props = { show: true, title: 'Details' }, slots = {}) =>
  mount(CatalogSheet, {
    props,
    slots: { default: '<p>Body</p>', ...slots },
    attachTo: document.body,
    global: {
      plugins: [i18n],
      stubs: { SheetHandle: { template: '<div data-test-id="handle" />' } },
    },
  });

const q = selector => document.body.querySelector(selector);

describe('CatalogSheet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing when hidden', () => {
    const wrapper = mountSheet({ show: false, title: 'Details' });
    expect(q('[data-test-id="catalog-sheet"]')).toBeNull();
    wrapper.unmount();
  });

  it('renders title, body and footer slot with a round close button at the end', () => {
    const wrapper = mountSheet(undefined, { footer: '<span>Foot</span>' });
    const header = q('[data-test-id="catalog-sheet-header"]');
    expect(header.textContent).toContain('Details');
    expect(header.lastElementChild.getAttribute('aria-label')).toBe('Close');
    expect(q('[data-test-id="catalog-sheet"]').textContent).toContain('Body');
    expect(q('[data-test-id="catalog-sheet"]').textContent).toContain('Foot');
    wrapper.unmount();
  });

  it('renders the drag handle as first child of the sheet', () => {
    const wrapper = mountSheet();
    expect(q('[data-test-id="catalog-sheet"]').firstElementChild).toBe(
      q('[data-test-id="handle"]')
    );
    wrapper.unmount();
  });

  it('emits close from the X button', () => {
    const wrapper = mountSheet();
    q('[data-test-id="catalog-sheet-close"]').click();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('emits close on Escape', () => {
    const wrapper = mountSheet();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('emits close when clicking the backdrop but not the sheet', () => {
    const wrapper = mountSheet();
    q('[data-test-id="catalog-sheet"]').click();
    expect(wrapper.emitted('close')).toBeUndefined();
    q('[data-test-id="catalog-sheet-backdrop"]').click();
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });
});
