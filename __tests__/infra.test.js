const { makeSuite, EVENTS } = require('./helpers/suite');

describe('test infrastructure', () => {
  const cases = {
    'should load the SDK then expose open': (ts) => {
      expect(typeof ts.RazorpayCheckout.open).toBe('function');
    },
    'should build an event emitter then expose emit': (ts) => {
      expect(typeof ts.emitter.emit).toBe('function');
    },
    'should reach the native module then expose open': (ts) => {
      expect(typeof ts.native.open).toBe('function');
    },
    'should register a success listener then count one': (ts) => {
      ts.emitter.addListener(EVENTS.success, () => {});
      expect(ts.emitter.listenerCount(EVENTS.success)).toBe(1);
    },
  };

  Object.entries(cases).forEach(([name, assertion]) => {
    it(name, () => assertion(makeSuite()));
  });
});
