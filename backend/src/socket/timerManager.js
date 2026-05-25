class TimerManager {
  constructor() {
    this.timers = new Map(); // roomId -> { timeout, startedAt, duration }
  }

  start(roomId, durationSeconds, onExpire) {
    this.clear(roomId);
    const startedAt = Date.now();
    const timeout = setTimeout(() => {
      this.timers.delete(roomId);
      onExpire();
    }, durationSeconds * 1000);

    this.timers.set(roomId, { timeout, startedAt, duration: durationSeconds });
  }

  clear(roomId) {
    const t = this.timers.get(roomId);
    if (t) {
      clearTimeout(t.timeout);
      this.timers.delete(roomId);
    }
  }

  getRemaining(roomId) {
    const t = this.timers.get(roomId);
    if (!t) return 0;
    const elapsed = (Date.now() - t.startedAt) / 1000;
    return Math.max(0, t.duration - elapsed);
  }

  getTimerInfo(roomId) {
    const t = this.timers.get(roomId);
    if (!t) return null;
    return { startedAt: t.startedAt, duration: t.duration };
  }

  clearAll() {
    this.timers.forEach((t) => clearTimeout(t.timeout));
    this.timers.clear();
  }
}

module.exports = { TimerManager };
