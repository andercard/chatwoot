import { ref, toValue } from 'vue';

// Pixels the finger must travel before we decide which axis the gesture follows.
export const AXIS_LOCK_THRESHOLD_PX = 8;
// Horizontal pull needed to settle open instead of snapping back.
export const OPEN_RATIO = 0.4;

const TOUCH_POINTER_TYPES = ['touch', 'pen'];

/**
 * Horizontal swipe gesture for touch and pen pointers (mouse is ignored).
 * The element must use `touch-pan-y` so vertical scrolling stays native.
 *
 * @param {Object} options
 * @param {number|Function} options.maxLeft - Max distance the content can move to the left.
 * @param {number|Function} options.maxRight - Max distance the content can move to the right.
 * @param {Function} options.onRelease - Called with `{ offsetX }` when the finger lifts.
 *   Return the offset to settle on (defaults to 0, which closes).
 */
export function useSwipeGesture({
  maxLeft = 0,
  maxRight = 0,
  onRelease = null,
} = {}) {
  const offsetX = ref(0);
  const isSwiping = ref(false);

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startOffset = 0;
  let isAxisLocked = false;
  let suppressClick = false;

  const clamp = value =>
    Math.min(toValue(maxRight), Math.max(-toValue(maxLeft), value));

  const reset = () => {
    pointerId = null;
    isAxisLocked = false;
    isSwiping.value = false;
  };

  const close = () => {
    offsetX.value = 0;
  };

  const onPointerdown = event => {
    if (!TOUCH_POINTER_TYPES.includes(event.pointerType)) return;
    if (pointerId !== null) return;
    suppressClick = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startOffset = offsetX.value;
    isAxisLocked = false;
  };

  const onPointermove = event => {
    if (event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!isAxisLocked) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD_PX)
        return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical movement wins: leave the gesture to the browser scroll.
        reset();
        return;
      }
      isAxisLocked = true;
      isSwiping.value = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    offsetX.value = clamp(startOffset + deltaX);
  };

  const finish = () => {
    if (pointerId === null) return;
    const wasSwiping = isSwiping.value;
    reset();
    if (!wasSwiping) return;
    suppressClick = true;
    const settled = onRelease?.({ offsetX: offsetX.value });
    offsetX.value = typeof settled === 'number' ? settled : 0;
  };

  const onPointercancel = () => {
    if (pointerId === null) return;
    const wasSwiping = isSwiping.value;
    reset();
    if (wasSwiping) offsetX.value = startOffset;
  };

  // Capture phase: swallow the click a swipe (or a tap on an open card) would trigger.
  const onClickCapture = event => {
    if (!suppressClick && offsetX.value === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  return {
    offsetX,
    isSwiping,
    close,
    handlers: {
      onPointerdown,
      onPointermove,
      onPointerup: finish,
      onPointercancel,
      onClickCapture,
    },
  };
}
