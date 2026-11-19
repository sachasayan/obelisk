export function createModeTimers() {
  const pending = new Set<NodeJS.Timeout>();

  return {
    schedule(callback: () => void, delay: number) {
      const timer = setTimeout(() => {
        pending.delete(timer);
        callback();
      }, delay);
      pending.add(timer);
    },
    clear() {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    },
  };
}
