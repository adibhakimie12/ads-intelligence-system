export const createDebouncedReloader = (callback, delayMs = 50) => {
  let timeoutId = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      void callback();
    }, delayMs);
  };
};