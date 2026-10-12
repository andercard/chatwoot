import { mount } from '@vue/test-utils';
import PreviewPicker from './PreviewPicker.vue';

const items = [
  { id: 1, title: 'Greeting', subtitle: 'Hello there', label: 'Greeting' },
  { id: 2, title: 'Farewell', subtitle: 'See you', label: 'Farewell' },
];

const mountPicker = props =>
  mount(PreviewPicker, {
    attachTo: document.body,
    props: { items, searchPlaceholder: 'Search', ...props },
    slots: {
      filters: '<span data-test="filters" />',
      preview: '<span data-test="preview" />',
    },
    global: {
      directives: {
        dompurifyHtml: (el, { value }) => {
          el.innerHTML = value;
        },
      },
    },
  });

describe('PreviewPicker', () => {
  let wrapper;

  afterEach(() => wrapper?.unmount());

  it('renders the search field, focuses it and shows the preview on desktop', () => {
    wrapper = mountPicker({ previewLayout: 'side' });

    const input = wrapper.find('input[role="combobox"]');
    expect(input.exists()).toBe(true);
    expect(document.activeElement).toBe(input.element);
    expect(wrapper.find('[data-test="filters"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="preview"]').exists()).toBe(true);
  });

  it('renders only a one-line list without search, focus, filters or preview in compact mode', () => {
    wrapper = mountPicker({ compact: true, previewLayout: 'side' });

    expect(wrapper.find('input').exists()).toBe(false);
    expect(document.activeElement).toBe(document.body);
    expect(wrapper.find('[data-test="filters"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="preview"]').exists()).toBe(false);
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2);
    expect(wrapper.find('[role="option"]').text()).toContain('Greeting');
    expect(wrapper.find('[role="option"]').text()).toContain('Hello there');
  });

  it('keeps the editor focused when a row is pressed in compact mode', async () => {
    wrapper = mountPicker({ compact: true });

    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    wrapper.find('[role="option"]').element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not block mouse presses on desktop', () => {
    wrapper = mountPicker();

    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    wrapper.find('[role="option"]').element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
