import { ref, onMounted, onBeforeUnmount, toValue } from 'vue';

// Pixels the finger must travel before we decide which axis the gesture follows.
export const AXIS_LOCK_THRESHOLD_PX = 8;
// Dragged distance (after resistance) needed to trigger a refresh.
export const PULL_REFRESH_THRESHOLD_PX = 70;
export const PULL_MAX_DISTANCE_PX = 120;
// Finger travel is damped so the indicator feels elastic.
export const PULL_RESISTANCE = 0.5;

/**
 * Pull-to-refresh for a scroll container, touch/pen only (uses touch events so
 * the gesture can be claimed with preventDefault when the list is at the top).
 *
 * @param {Object} options
 * @param {Ref<HTMLElement>} options.scrollEl - Scrollable container.
 * @param {Function} options.onRefresh - Async callback; spinner stays until it settles.
 */
export function usePullToRefresh({ scrollEl, onRefresh }) {
  const isPulling = ref(false);
  const isRefreshing = ref(false);
  const pullDistance = ref(0);

  let startX = 0;
  let startY = 0;
  let isArmed = false;
  let isLocked = false;

  const reset = () => {
    isArmed = false;
    isLocked = false;
    isPulling.value = false;
    if (!isRefreshing.value) pullDistance.value = 0;
  };

  const onTouchstart = event => {
    const el = toValue(scrollEl);
    if (isRefreshing.value || event.touches.length !== 1 || !el) return;
    if (el.scrollTop > 0) return;
    isArmed = true;
    isLocked = false;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  };

  const onTouchmove = event => {
    if (!isArmed) return;
    const deltaX = event.touches[0].clientX - startX;
    const deltaY = event.touches[0].clientY - startY;

    if (!isLocked) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < AXIS_LOCK_THRESHOLD_PX)
        return;
      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
        // Upward or horizontal: leave it to native scroll / card swipe.
        reset();
        return;
      }
      isLocked = true;
      isPulling.value = true;
    }

    if (event.cancelable) event.preventDefault();
    pullDistance.value = Math.min(
      PULL_MAX_DISTANCE_PX,
      deltaY * PULL_RESISTANCE
    );
  };

  const onTouchend = async () => {
    if (!isLocked) {
      reset();
      return;
    }
    const shouldRefresh = pullDistance.value >= PULL_REFRESH_THRESHOLD_PX;
    isArmed = false;
    isLocked = false;
    isPulling.value = false;
    if (!shouldRefresh) {
      pullDistance.value = 0;
      return;
    }
    isRefreshing.value = true;
    pullDistance.value = PULL_REFRESH_THRESHOLD_PX;
    try {
      await onRefresh();
    } finally {
      isRefreshing.value = false;
      pullDistance.value = 0;
    }
  };

  onMounted(() => {
    const el = toValue(scrollEl);
    if (!el) return;
    el.addEventListener('touchstart', onTouchstart, { passive: true });
    // Non-passive so a downward pull from the top can cancel native overscroll.
    el.addEventListener('touchmove', onTouchmove, { passive: false });
    el.addEventListener('touchend', onTouchend);
    el.addEventListener('touchcancel', reset);
  });

  onBeforeUnmount(() => {
    const el = toValue(scrollEl);
    if (!el) return;
    el.removeEventListener('touchstart', onTouchstart);
    el.removeEventListener('touchmove', onTouchmove);
    el.removeEventListener('touchend', onTouchend);
    el.removeEventListener('touchcancel', reset);
  });

  return { isPulling, isRefreshing, pullDistance };
}
