/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Throttle utility for high-frequency events (T018)
 * Limits function execution to once per specified interval
 *
 * @example
 * const throttledUpdate = throttle(() => updateUI(), 1000)
 * window.addEventListener('resize', throttledUpdate) // Max 1 call per 1000ms
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => any {
  let inThrottle: boolean;
  let lastResult: any;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args);
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };
}

/**
 * Debounce utility for delayed execution
 * Delays function execution until specified time after last call
 *
 * @example
 * const debouncedSearch = debounce((query) => search(query), 500)
 * input.addEventListener('change', (e) => debouncedSearch(e.target.value))
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Request animation frame based throttle for smooth animations
 * Ensures updates happen on animation frames only
 *
 * @example
 * const rafThrottle = throttleRAF((data) => updateChart(data))
 * websocket.on('data', rafThrottle)
 */
export function throttleRAF<T extends (...args: any[]) => any>(
  func: T,
): (...args: Parameters<T>) => void {
  let frameId: number | null = null;
  let lastArgs: Parameters<T>;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (frameId === null) {
      frameId = requestAnimationFrame(() => {
        func.apply(this, lastArgs);
        frameId = null;
      });
    }
  };
}

/**
 * Leading throttle - calls function immediately then throttles
 * Useful for immediate feedback followed by rate-limited updates
 */
export function throttleLeading<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

/**
 * Trailing throttle - calls function after throttle period ends
 * Useful for batch updates after a series of events
 */
export function throttleTrailing<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T>;

  return function (this: any, ...args: Parameters<T>) {
    lastArgs = args;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, lastArgs);
      timeoutId = null;
    }, limit);
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
