Design Record · v7

# Magic Checkout (Shopify) in react-native-razorpay — revised architecture

**Author:** n.maneeshgupta · **Pod:** Magic Checkout · **BU:** Platforms · **Date:** Aug 28, 2026
**Status:** Approved in brainstorm — pending written review

**Supersedes** the architecture sections of `2026-08-25-rn-magic-shopify-design.md`
(aidocs `doc_nlfwhc7wob4hgy7i`, v6). The problem statement (§1), scope (§2), out-of-scope
(§3) and NFRs (§9) of v6 still stand. §7.5–§8 and §11 of v6 are replaced by this document.
v6 is not edited in place because it is published in aidocs; this is the honest delta.

---

## 1. Why v6 was wrong

v6 proposed `openMagicCheckout()` inside `react-native-razorpay` making three `fetch`
calls to MCS, with a client-side handle, bounded poll and `resumeMagicCheckout`. Reading
the five repos invalidated four of its load-bearing claims.

| # | v6 claim | What the code says |
|---|---|---|
| D1 | Phase 1 needs a new MCS endpoint | `checkout.js` already calls `magic/checkout/shopify` and `magic/order/shopify` (`initialize-shopify.ts:169`, `shopify/order.ts:46`), which are `1cc-consumer-app`'s existing `CreateCheckout` / `CreateOrderAndGetPreferences` routes |
| D2 | `_.integration_type: 'shopify_checkout'` activates Magic | No such value is read anywhere. Nothing would activate |
| D3 | The SDK must pass `shopify_cart` | The Magic UI renders from `prefsOrder.line_items` / `line_items_total` when not in lite flow (`main-modal/helpers/magic.ts:176-180`). `isMagic()` is satisfied by `hasLineItemsTotal` alone (`isMagic.ts:20,26`) |
| D4 | The SDK cannot read Splitz, so the complete route must be hardcoded | `magic-plugins` doesn't read Splitz from a client SDK either — experiments arrive in the create-order **server response** (`setMagicExperiments(data.experiments)`, `handlers.ts:86`) |

D3 and D4 are the consequential ones. D3 removes all cart data from the device; D4 removes
the only permanent risk of putting orchestration in a pinned npm package.

## 2. The organising principle

On web, `magic-plugins` — the **merchant-side host integration layer** — orchestrates.
`checkout.js` renders the Magic UI and takes the payment; it never brackets the modal.

> `magic-plugins` : Shopify storefront page :: `react-native-razorpay` : merchant RN app

`react-native-razorpay` occupies the same architectural position, so it takes the same
role. This is the pattern, stated plainly, and every decision below follows from it.

**Where the analogy breaks, and how we pay for it.** `magic-plugins` is a Razorpay-deployed
CDN script — a fix reaches every storefront on next page load. An npm package is pinned by
the merchant and gated behind app-store review, so a fix can take months. We do not get both
properties on mobile. We keep the architectural position and neutralise the deployment cost
by making the SDK **thin and server-tunable**: every mutable decision (endpoint choice,
experiment values, thresholds) arrives in the phase-1 response rather than living in a
constant. Static code in a pinned binary is only dangerous if it encodes a decision that
might change.

## 3. Goals and non-goals

**Goals**

- A React Native app completes a Shopify Magic Checkout end-to-end in one SDK call.
- `open()`'s public behaviour is unchanged, enforced by characterisation tests.
- No Shopify cart data, line items or monetary amounts ever reach the device.
- No native code changes. No `checkout.js` changes.
- Full happy path testable in CI — no device, no Shopify store, no merchant key.

**Non-goals**

- Feature parity with `magic-plugins` (analytics fan-out, abandoned cart, coupon prefill,
  experiments sync, loyalty, gift cards) — v6 §3 stands unchanged.
- Cross-framework reuse in v1. The core is written to allow a Flutter/Capacitor adapter
  later (§6), but no second wrapper ships now.
- A storage dependency. The SDK persists nothing.

## 4. Chosen approach

Three phases, orchestrated in the SDK's JS layer, exactly as `magic-plugins` does on web.

```
RN app   openMagicCheckout({ key, storefront_access_token, cart_id })
  │
  ├─1─►  POST /v1/magic/shopify/init?key_id=…        1cc-consumer-app  ← NEW
  │      { storefront_access_token, cart_id }
  │      ← { order_id, experiments }
  │
  ├─2─►  open({ key, order_id })                     existing native path, UNCHANGED
  │      native SDK WebView → checkout.js → isMagic() → Magic UI → payment
  │      ← Razorpay::PAYMENT_SUCCESS { payment_id, order_id, signature }
  │
  └─3─►  POST 1cc/shopify/complete  |  checkouts/shopify/complete
         branch on experiments['shopify_pre_payment_guardrail'] === 'variant_on'
         ← resolve
```

### 4.1 What was chosen over what

| Decision | Chosen | Over | Why |
|---|---|---|---|
| Orchestrator | SDK JS layer | `checkout.js` | Matches `magic-plugins`' position; release independence; CI-testable without a device; zero blast radius on a bundle serving 100% of checkout traffic |
| Phase-1 backend | New `/v1/magic/shopify/init` in consumer-app | Two existing calls | One round trip on mobile networks; cart and order cannot drift |
| Modal input | `order_id` only | `order_id` + `shopify_cart` | Nothing cart-shaped crosses the bridge — see §5.2 |
| Cart source | Server reads it via the app's Storefront token | App maps and sends a `/cart.js` cart | Keeps every price server-side |
| Complete route | Direct call, branched on server-supplied experiments | A consumer-app proxy | Byte-for-byte the `magic-plugins` pattern; no second endpoint |
| Phase-3 semantics | Bounded receipt-confirmation | Await placement | See §5.4 |

### 4.2 Rejected

- **`checkout.js` orchestrates.** Would need three FE changes and gives no npm release
  path. Its one real advantage — instant fixes for every platform at once — is bought at
  the cost of blast radius on the highest-traffic bundle Razorpay ships.
- **`_.integration_type: 'x'` to activate lite mode.** `isMagicXFlow()` is a suppression
  flag in ~14 places (`prefill-coupon.ts:52`, `auto-coupon.ts:39`,
  `automatic-discount-sync-with-contact-details.ts:43,120`, `eligibility.ts:65,189`,
  `coupon-utils.ts:97`) and would silently disable coupons.
- **A portable core as a separate npm package.** A second release train for one consumer.
  The seam (§6) gets the benefit without the package.

## 5. Components and boundaries

### 5.1 `1cc-consumer-app` — `POST /v1/magic/shopify/init`

The only new endpoint. `checkout.js` already calls this exact path
(`initialize-shopify.ts:226`, behind `isMagicShopifyLoadtimeV2Enabled()`), but **no backend
implements it** in `1cc-consumer-app`, `magic-checkout-service` or the API monolith —
confirmed. So the contract is ours to define.

```
req  { storefront_access_token, cart_id }                        + ?key_id=
  1. merchantConfig.GetFromCache(key_id)                          existing
  2. credentials{ ShopName: *merchantConfig.ShopId,               ← pinned server-side
                  StorefrontAccessToken: req.storefront_access_token }
  3. GetMobileCartDetails(creds, cart_id)                         NEW query + gw method
  4. toCartDTO(sfCart)                                            NEW mapper
  5. CreateCheckout(...)               → shopify_checkout_id      existing, unchanged
  6. CreateOrderAndGetPreferences(...) → order_id + preferences   existing, unchanged
resp { order_id, experiments, ... }
```

Steps 5 and 6 compose because `CreateOrderAndGetPreferences` needs only
`shopify_checkout_id` + `key_id` and re-reads cart and checkout from the cache step 5 wrote
(`checkout.go:555`).

**Why the app's Storefront token and not the merchant's.** The cart is created by AppBrew's
Storefront app, so it is readable only with AppBrew's token. `merchantConfig` does carry a
`StorefrontAccessToken` (`checkout.go:372`), but it belongs to Razorpay's Shopify app and
is used for step 5's re-creation, not step 3's read.

**Security boundary.** `ShopName` always comes from `merchantConfig.ShopId`, never from the
request. A supplied token therefore cannot redirect the outbound call at another shop; the
worst a bad token achieves is a 401 from the merchant's own domain.

**Mapper rules.** `gid://shopify/ProductVariant/123` → `int64` 123.
`gid://shopify/Cart/c1-abc` → `Cart.Token = "c1-abc"`, so the cart-token→unique-ID
mapping (`storeCartTokenToUniqueIDMapping`, `checkout.go:164`) keeps working. That
function is service-level, so the mobile path reaches it.

> **Correction, verified during execution.** This section previously also cited
> `observeCartProperties`' `c1-` prefix check. That function is controller-only
> (`controllers/checkout/checkout.go:89`); `MobileInit` calls the service directly and
> bypasses it, so cart-property metrics do not fire for mobile carts. Harmless — the
> metric detects `/cart.js` schema drift from the web plugin, impossible for a
> server-built cart — but it is not why the token is stripped.

**New query, not an extended one.** `GetShopifyCartDetailsMutation()`
(`pkg/shopify/client/graphql/queries.go:268`) omits `image`, `productType`, `taxable` and
`description`, which `dtos.Item` carries. A separate mobile query avoids widening the
Storefront response for the coupons path, which shares the existing one.

### 5.2 `react-native-razorpay` — the orchestrator

Phase 2 is the existing path with the existing option set:

```js
RazorpayCheckout.open({ key, order_id })
```

Nothing else is required. Verified against `checkout.js`:

- `isMagic()` → true via `hasLineItemsTotal` from the order plus the server-side
  `hasFeature('one_click_checkout')` (`isMagic.ts:20,22,26`). No cart option needed.
- `shouldCreateShopifyCheckout()` / `shouldCreateShopifyOrder()` → both false, because both
  return `isMagicShopifyCheckoutFlow()` which needs lite mode, which needs `merchant_key` in
  the URL or `isMagicXFlow()` — neither true in a native WebView. **`checkout.js` will not
  re-create the order.**
- `getShippingMethodBasedOnExp()` → `'orderId'`, so serviceability uses
  `getServiceabilityBasedOnOrderId` and never touches `shopify_cart`
  (`compute-shipping-method.ts:10-28`).
- `syncShopifyOrderId()` resolves, because `orderIdPromise` is resolved by `setOptions`
  when `order_id` is present (`options.ts:24`).

`one_click_checkout: true` is passed to mirror web but is not load-bearing — `isMagic()`
reads the server-side feature, not the option. Confirm on device before removing.

**The one change to existing code.** `open()` calls `removeSubscriptions()` on first
success (`RazorpayCheckout.js:45`), and it uses `removeAllListeners`, so phase 3 cannot run
after it. Listener wiring is extracted into an internal helper shared by both entry points,
preserving `open()`'s public behaviour byte-for-byte — including that listeners are removed
on first success and that `successCallback`/`errorCallback` take precedence over the
promise. Characterisation tests land before the extraction.

### 5.3 `checkout` (FE) — no changes

Stated explicitly because v6 assumed otherwise, and because §5.2's four bullets are the
evidence. If any of them turns out false on device, that is a design-invalidating finding,
not a bug — escalate rather than patch.

### 5.4 Phase 3 — bounded receipt-confirmation

`PublishCompleteCheckoutMessage` lives inside `complete_checkout.go:1372`, so MCS's SQS
worker is enqueued **by** the CompleteCheckout flow. There is no payment-webhook-driven
placement: if the client's `complete` never lands, no order is placed and the retry/refund
machinery never starts. The call is therefore load-bearing for correctness.

But the client only needs the request to **arrive**. Once MCS has it, placement is owned
server-side by the mutex, the 24h placed-marker, the Shopify search fallback and the worker
(3 attempts at ~5/10/15 min, refund on exhaustion). Waiting for the order buys nothing.

| Outcome | Action |
|---|---|
| `200` — placed | resolve with `order_status_url`, total |
| Accepted-pending (`DELEGATED_TO_SQS`, `422` already-placed) | resolve — MCS owns it. **A success path, not an error** |
| `5xx` / network error | retry within the budget — safe, MCS is idempotent |
| Budget exhausted, still unknown | resolve, flagged so the app can show "confirming your order" |

One hard client budget, **~8s**, tunable from the phase-1 response. Deliberately not v6's
30s: bounded to a few seconds, any native SDK tolerates the delay before `oncomplete`, so
the SDK-timeout question stops being a design risk.

**Residual risk, stated not hidden.** If the app dies inside that window, `complete` never
lands and nothing recovers it. Two responses, both taken: `PAYMENT_SUCCESS` already carries
`razorpay_payment_id`, `razorpay_order_id` and `razorpay_signature`, and the app supplied
`key` — that *is* the recovery handle, so a merchant app can retry `complete` itself with no
SDK change, documented in the README rather than built. And a server-side reconciliation
sweep over 1CC orders with a captured payment and no Shopify order is filed as a follow-up
ask to the MCS team; it is the only thing that closes the window properly, and it benefits
web equally.

## 6. Cross-platform seam

The core (`src/magic/core/`) imports nothing from `react-native`. It takes two ports:

```
createMagicCheckout({ host, http })
  host: { open(options): void, subscribe({onSuccess, onError}): Unsubscribe }
  http: { post(url, body, {timeout}) }        // default: global fetch
→ { openMagicCheckout, onMagicEvent }
```

`src/magic/adapters/reactNative.js` is the only file that knows a bridge exists. A Flutter,
Capacitor or web wrapper writes its own adapter against the same two methods. This costs
one indirection now and is the difference between an adapter and a rewrite later. It also
makes the core testable with zero React Native mocking, which is what delivers the
"CI, no device" goal.

## 7. Data flow and error handling

| Phase | Failure | Payment at risk | Behaviour |
|---|---|---|---|
| 1 | network / 4xx / merchant not 1CC-enabled | No | reject `MAGIC_ORDER_CREATE_FAILED`, `reason` set |
| 2 | user dismissed | No | reject `MAGIC_CHECKOUT_CANCELLED`, **phase 3 not entered** |
| 2 | payment error | No | reject `MAGIC_PAYMENT_FAILED`, native code passed through |
| 3 | pending / already-placed | Yes | resolve — MCS owns placement |
| 3 | 5xx / network | Yes | retry within budget, then resolve flagged |

Native error codes, verified against `com.razorpay:standard-core` 1.7.18:
`PAYMENT_CANCELED = 0`, `NETWORK_ERROR = 2`, `INVALID_OPTIONS = 3`, `TLS_ERROR = 6`,
`INCOMPATIBLE_PLUGIN = 7`.

Log and event names are `UPPER_SNAKE_CASE` in `ACTION_STATUS` form with the cause in a
queryable `reason` field, never baked into the name:
`MAGIC_CREATE_ORDER_SUCCESS`/`_FAILED`, `MAGIC_PAYMENT_SUCCESS`/`_FAILED`,
`MAGIC_COMPLETE_SUCCESS`/`_FAILED`, `MAGIC_COMPLETE_PENDING`.

## 8. Testing strategy

The repo has no test infrastructure today — no jest, no devDependencies, no tests.
Establishing it is in scope and is task 1.

- **Unit** — cart-input validation, error taxonomy, backoff and budget scheduling with fake
  timers.
- **Contract** — request and response shapes against §5.1, mocked `fetch`.
- **Orchestrator** — every row of the §7 table, plus: complete is never called after
  dismissal; a `5xx`-then-`200` sequence resolves; budget exhaustion resolves flagged.
- **Regression** — characterisation tests proving `open()` unchanged, including the
  `removeAllListeners` quirk and callback precedence.
- Table-driven, keyed `"should X then Y"`, shared setup behind a suite factory.
- **Device (UAT)** — the four §5.2 bullets, on both platforms, against a 1CC-enabled test
  merchant. This is the design-invalidating check and belongs early, not at the end.

## 9. Assumptions

| # | Assumption | Confidence |
|---|---|---|
| A1 | Magic renders in the native WebView given `order_id` alone for a 1CC-enabled merchant | High — derived from `isMagic.ts:20,26` and `magic.ts:176-180`; **device-verify first** |
| A2 | The 1CC order carries `line_items` and `line_items_total` | High — the web native-checkout branch relies on it |
| A3 | `/v1/magic/shopify/init` has no existing owner | Confirmed by grep across consumer-app, MCS and the API monolith; consumer-app checkout 4 days old |
| A4 | AppBrew's Storefront token has `unauthenticated_read_product_*` for the new query fields | **Unverified — external confirmation needed** |
| A5 | `experiments` can be returned from the phase-1 response as web's create response does | Medium — needs MCS/consumer-app agreement |

A5 is load-bearing twice: it supplies the `shopify_pre_payment_guardrail` branch (§4) and
the phase-3 budget (§5.4). If it cannot be agreed, the fallback is to hardcode
`1cc/shopify/complete` and an 8s budget — which reinstates v6 §11.1's pre-ramp blocker and
makes it permanent rather than temporary. That is a materially worse position, so A5 should
be settled before implementation rather than during it.
| A6 | Merchant is 1CC-enabled server-side (`features.one_click_checkout`) | Precondition, not ours |

`prefill` is deliberately **omitted** from the phase-1 response. v6 §8.1.3 warned against
shipping it undefined; the app passes standard checkout `prefill` through options instead.

## 10. Open items

1. A4 — token scopes, with AppBrew.
2. A5 — `experiments` in the init response, with the Magic Checkout team.
3. The reconciliation sweep (§5.4) — filed as a follow-up ask, not v1 scope.
