import { mount } from '@vue/test-utils';
import WaveformSeekBar, { getKnobOffset } from './WaveformSeekBar.vue';

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
  it('renders the minimum 16 bars when the width is unknown', () => {
    const { wrapper } = mountBar();
    expect(wrapper.findAll('span')).toHaveLength(16);
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

  it('places the knob with a translate3d transform', () => {
    const { wrapper } = mountBar({ progress: 0.5 });
    const style = wrapper
      .find('[data-test-id="seek-knob"]')
      .attributes('style');
    expect(style).toContain('translate3d(');
    expect(style).not.toContain('inset');
  });

  it('computes the knob offset from the measured width', () => {
    expect(getKnobOffset(0.5, 200)).toBe(94);
    expect(getKnobOffset(0.5, 200, true)).toBe(-94);
    expect(getKnobOffset(0, 200)).toBe(-6);
  });
});
