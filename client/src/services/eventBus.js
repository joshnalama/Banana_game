/**
 * Theme 2: Event-Driven Architecture (EDA)
 * Custom Decoupled Pub/Sub Event Bus (EventEmitter pattern)
 * Decouples puzzle gameplay, audio synthesizer, and telemetry audits.
 */

export class CustomEventBus {
  constructor() {
    this.events = new Map();
    this.auditHistory = [];
    this.maxAuditEntries = 60;
  }

  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.events.has(event)) return;
    this.events.get(event).delete(handler);
    if (this.events.get(event).size === 0) {
      this.events.delete(event);
    }
  }

  once(event, handler) {
    const wrapper = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    return this.on(event, wrapper);
  }

  emit(event, payload = {}) {
    // Record telemetry audit event
    const auditRecord = {
      event,
      timestamp: Date.now(),
      payload,
    };
    this.auditHistory.push(auditRecord);
    if (this.auditHistory.length > this.maxAuditEntries) {
      this.auditHistory.shift();
    }

    if (!this.events.has(event)) return;
    const handlers = Array.from(this.events.get(event));
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${event}:`, err);
      }
    }
  }

  getAuditHistory() {
    return [...this.auditHistory];
  }

  clear() {
    this.events.clear();
    this.auditHistory = [];
  }
}

export const eventBus = new CustomEventBus();
