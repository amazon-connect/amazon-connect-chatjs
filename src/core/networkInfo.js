import { EventBus } from "./eventbus";

function isBrowser() {
  return typeof window === 'object' && window.navigator && window.addEventListener;
}

class DummyNetworkInfo {

  onOnline() {}
  
  onOffline() {}
  
  isOnline() {
    return true;
  }
  
  whenOnline() {
    return Promise.resolve();
  }
}

class BrowserNetworkInfo {

  constructor() {
    this.eventBus = new EventBus();
    this.onlinePromise = null;
    
    window.addEventListener('online', () => {
      this.eventBus.trigger('online');
    });
    
    window.addEventListener('offline', () => {
      this.eventBus.trigger('offline');
    });
  }

  onOnline(handler) {
    return this.eventBus.subscribe('online', handler);
  }
  
  onOffline(handler) {
    return this.eventBus.subscribe('offline', handler);
  }
  
  isOnline() {
    return window.navigator.onLine;
  }
  
  whenOnline() {
      if (this.isOnline()) {
        return Promise.resolve();
      }
      if (!this.onlinePromise) {
        this.onlinePromise = new Promise(resolve => {
          const unsubscribe = this.onOnline(() => {
            this.onlinePromise = null;
            unsubscribe();
            resolve();
          });
        });
      }
      return this.onlinePromise;
  }
}

export const NetworkInfo = isBrowser() ? new BrowserNetworkInfo() : new DummyNetworkInfo();
