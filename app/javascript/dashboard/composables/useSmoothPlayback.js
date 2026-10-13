import { ref, onUnmounted } from 'vue';

// `timeupdate` only fires ~4 times per second and browsers report
// `currentTime` in coarse (Safari: late) steps, which makes a progress knob
// jump. While playing we read the media clock on every frame and interpolate
// between real updates. Real seeks are told apart by the `seeking` event,
// never by comparing times, or the knob would jump back at 1.5x/2x.
const MAX_LEAD_SECONDS = 0.4;
const MIN_READY_STATE = 3;

export function useSmoothPlayback(getMedia, getDuration = () => Infinity) {
  const currentTime = ref(0);
  let rafId = null;
  let lastMediaTime = 0;
  let lastStamp = 0;
  let lastRealTime = 0;

  const rebase = (time = currentTime.value) => {
    lastMediaTime = time;
    lastStamp = performance.now();
  };

  // Align the interpolated clock with the real one (seeks, pause, stop)
  const sync = () => {
    const real = getMedia()?.currentTime ?? 0;
    lastRealTime = real;
    rebase(real);
    currentTime.value = real;
    return real;
  };

  // Jump to a known position (the user dragged the knob)
  const jumpTo = time => {
    lastRealTime = time;
    rebase(time);
    currentTime.value = time;
  };

  const tick = () => {
    const el = getMedia();
    rafId = requestAnimationFrame(tick);
    if (!el) return;
    const real = el.currentTime;
    const canExtrapolate =
      !el.paused &&
      !el.ended &&
      !el.seeking &&
      el.readyState >= MIN_READY_STATE;

    if (!canExtrapolate) {
      sync();
      return;
    }

    const now = performance.now();
    if (real !== lastRealTime) {
      lastRealTime = real;
      lastMediaTime = Math.max(real, currentTime.value);
      lastStamp = now;
    }

    const estimate =
      lastMediaTime + ((now - lastStamp) / 1000) * el.playbackRate;
    const lead = real + MAX_LEAD_SECONDS * el.playbackRate;
    const max = Number.isFinite(getDuration()) ? getDuration() : estimate;
    currentTime.value = Math.max(
      currentTime.value,
      Math.min(estimate, lead, max)
    );
  };

  const start = () => {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    if (getMedia()) sync();
  };

  const isRunning = () => rafId !== null;

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  });

  return { currentTime, start, stop, sync, jumpTo, rebase, isRunning };
}
