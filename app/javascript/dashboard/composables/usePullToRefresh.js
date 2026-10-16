import { ref, onMounted, onBeforeUnmount, toValue } from 'vue';

// Pixels the finger must travel before the pull is claimed. Larger than the
// card swipe axis threshold (8px) so swipes never reach it.
export const PULL_AXIS_LOCK_THRESHOLD_PX = 24;
// Vertical travel must be at least this many times the horizontal travel.
export const PULL_VERTICAL_RATIO = 2;
// Early drift that already marks the gesture as a swipe or a scroll up.
const DISARM_DRIFT_PX = 8;
// Touches starting on these keep their own gesture (text selection, sliders).
const OWN_GESTURE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [role="slider"]';
// Swipe cards set an inline translateX; any value other than 0 means open or moving.
const OPEN_CARD_SELECTOR =
  '[style*="translateX("]:not([style*="translateX(0px)"])';
// Dragged distance (after resistance) needed to trigger a refresh.
export const PULL_REFRESH_THRESHOLD_PX = 70;
export const PULL_MAX_DISTANCE_PX = 120;
// Finger travel is damped so the indicator feels elastic.
export const PULL_RESISTANCE = 0.5;

/**
 * Pull-to-refresh for a scroll container, touch only. Listeners are passive and
 * never call preventDefault, so native scroll and card/bubble swipes are untouched;
 * the indicator only follows the finger visually.
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
    if (event.target.closest?.(OWN_GESTURE_SELECTOR)) return;
    if (el.querySelector(OPEN_CARD_SELECTOR)) return;
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
      const absX = Math.abs(deltaX);
      // Upward, or already leaning horizontal: hand over to scroll / swipe.
      if (
        deltaY < -DISARM_DRIFT_PX ||
        (absX >= DISARM_DRIFT_PX && absX > deltaY)
      ) {
        reset();
        return;
      }
      if (deltaY < PULL_AXIS_LOCK_THRESHOLD_PX) {
        if (absX >= PULL_AXIS_LOCK_THRESHOLD_PX) reset();
        return;
      }
      if (deltaY < absX * PULL_VERTICAL_RATIO) {
        reset();
        return;
      }
      isLocked = true;
      isPulling.value = true;
    }

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
    el.addEventListener('touchmove', onTouchmove, { passive: true });
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
