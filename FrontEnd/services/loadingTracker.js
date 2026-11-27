// Counts requests in flight so the LoadingBar can show while anything is loading
let pending = 0;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(pending > 0));
}

// Wrap any promise (API call) to show the loading bar until it settles
export function trackLoading(promise) {
  pending++;
  notify();
  return promise.finally(() => {
    pending--;
    notify();
  });
}

// listener(isLoading) is called on every change; returns an unsubscribe function
export function subscribeLoading(listener) {
  listeners.add(listener);
  listener(pending > 0);
  return () => listeners.delete(listener);
}
