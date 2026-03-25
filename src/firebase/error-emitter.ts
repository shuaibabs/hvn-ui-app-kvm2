
type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;

interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>(eventName: K, callback: (payload: T[K]) => void): void;
  off<K extends EventKey<T>>(eventName: K, callback: (payload: T[K]) => void): void;
  emit<K extends EventKey<T>>(eventName: K, payload: T[K]): void;
}

function createNanoEvents<T extends EventMap>(): Emitter<T> {
  let events: { [E in keyof T]?: ((...args: any[]) => void)[] } = {};

  return {
    on(eventName, callback) {
      (events[eventName] = events[eventName] || []).push(callback);
    },
    off(eventName, callback) {
      if (events[eventName]) {
        events[eventName] = events[eventName]!.filter(i => i !== callback);
      }
    },
    emit(eventName, payload) {
      (events[eventName] || []).forEach(callback => callback(payload));
    },
  };
}

// Define the event map for our application
interface AppEvents {
  'permission-error': import('./errors').FirestorePermissionError;
}

// Create and export a singleton emitter instance
export const errorEmitter = createNanoEvents<AppEvents>();
