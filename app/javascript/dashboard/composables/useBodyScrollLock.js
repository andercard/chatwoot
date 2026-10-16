import { watch, toValue, onBeforeUnmount } from 'vue';

// API: useBodyScrollLock(isActive)
//   isActive: ref/getter/boolean. While true this caller holds one lock on the
//   document; released when it turns false or on unmount. Several sheets can
//   hold locks at once: the body is only restored when the last one releases.
//
// The lock is dynamic (applied/removed at runtime), so styles are set from JS
// on document.body instead of a static class. It uses position: fixed with a
// negative top (needed on iOS, where overflow: hidden alone does not stop
// scrolling) and restores window.scrollY when the last lock is released.

const LOCKED_STYLES = {
  overflow: 'hidden',
  position: 'fixed',
  width: '100%',
};

let lockCount = 0;
let savedScrollY = 0;
let savedStyles = {};

const lock = () => {
  lockCount += 1;
  if (lockCount > 1) return;
  const { body } = document;
  savedScrollY = window.scrollY;
  savedStyles = {
    top: body.style.top,
    ...Object.fromEntries(
      Object.keys(LOCKED_STYLES).map(key => [key, body.style[key]])
    ),
  };
  Object.assign(body.style, LOCKED_STYLES, { top: `-${savedScrollY}px` });
};

const unlock = () => {
  lockCount -= 1;
  if (lockCount > 0) return;
  lockCount = 0;
  Object.assign(document.body.style, savedStyles);
  window.scrollTo(0, savedScrollY);
};

export function useBodyScrollLock(isActive) {
  let held = false;

  const sync = active => {
    if (active && !held) {
      held = true;
      lock();
    } else if (!active && held) {
      held = false;
      unlock();
    }
  };

  watch(() => !!toValue(isActive), sync, { immediate: true });
  onBeforeUnmount(() => sync(false));
}
