'use strict';

import { createClient } from './client';
import { makeOpenMagicCheckout } from './openMagicCheckout';

// `now` is injected so the phase-3 poll budget is testable with a fake clock
// instead of sleeping in tests. `host` and `http` are ports supplied by the
// platform-specific caller (RN NativeModules/TurboModule + fetch, in prod).
export function createMagicCheckout({ host, http, now }) {
  const clock = now || (() => Date.now());
  const rawClient = createClient(http);
  const client = {
    init: rawClient.init,
    complete: (key, experiments, handle) =>
      rawClient.complete(key, experiments, handle, clock),
  };
  return { openMagicCheckout: makeOpenMagicCheckout({ host, client }) };
}
