class NativeEventEmitter {
  constructor(nativeModule) {
    this.nativeModule = nativeModule;
    this.listeners = {};
    NativeEventEmitter.instances.push(this);
  }

  addListener(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return { remove: () => this.removeListener(event, cb) };
  }

  removeListener(event, cb) {
    this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== cb);
  }

  removeAllListeners(event) {
    this.listeners[event] = [];
  }

  emit(event, data) {
    (this.listeners[event] || []).slice().forEach((cb) => cb(data));
  }

  listenerCount(event) {
    return (this.listeners[event] || []).length;
  }
}

NativeEventEmitter.instances = [];

const NativeModules = {
  RNRazorpayCheckout: { open: jest.fn() },
  RazorpayEventEmitter: { addListener: jest.fn(), removeListeners: jest.fn() },
};

module.exports = { NativeModules, NativeEventEmitter };
