import { mount } from '@vue/test-utils';
import WaveformSeekBar from './WaveformSeekBar.vue';

const mountBar = (props = {}) => {
  const wrapper = mount(WaveformSeekBar, { props: { duration: 10, ...props } });
  const el = wrapper.find('[role="slider"]').element;
  el.getBoundingClientRect = () => ({ left: 100, width: 200 });
  el.setPointerCapture = vi.fn();
  el.releasePointerCapture = vi.fn();
  return { wrapper, el };
};

const fire = (wrapper, type, clientX) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientX, pointerId: 1 });
  wrapper.find('[role="slider"]').element.dispatchEvent(event);
};

describe('WaveformSeekBar', () => {
  it('renders 48 bars', () => {
    const { wrapper } = mountBar();
    expect(wrapper.findAll('span')).toHaveLength(48);
  });

  it('emits ~0.5 when dragging to the middle and captures the pointer', () => {
    const { wrapper, el } = mountBar();
    fire(wrapper, 'pointerdown', 100);
    fire(wrapper, 'pointermove', 200);
    const events = wrapper.emitted('seek');
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);
    expect(events.at(-1)[0]).toBeCloseTo(0.5);
  });

  it('clamps to 0-1 when released outside the bar', () => {
    const { wrapper, el } = mountBar();
    fire(wrapper, 'pointerdown', 150);
    fire(wrapper, 'pointerup', 900);
    expect(wrapper.emitted('seek').at(-1)[0]).toBe(1);
    expect(el.releasePointerCapture).toHaveBeenCalled();

    fire(wrapper, 'pointerdown', 150);
    fire(wrapper, 'pointerup', -50);
    expect(wrapper.emitted('seek').at(-1)[0]).toBe(0);
  });

  it('seeks with arrow keys', async () => {
    const { wrapper } = mountBar({ progress: 0.5 });
    await wrapper
      .find('[role="slider"]')
      .trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('seek')[0][0]).toBeCloseTo(0.55);
  });

  it('places the knob at the progress position', () => {
    const { wrapper } = mountBar({ progress: 0.5 });
    expect(
      wrapper.find('[data-test-id="seek-knob"]').attributes('style')
    ).toContain('50%');
  });

  it('keeps the knob within 0-1', async () => {
    const { wrapper } = mountBar({ progress: 3 });
    const knob = () => wrapper.find('[data-test-id="seek-knob"]');
    expect(knob().attributes('style')).toContain('100%');
    await wrapper.setProps({ progress: -2 });
    expect(knob().attributes('style')).toContain('calc(0%');
  });
});
