# Magic Checkout (Shopify) for React Native — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Each task's implementation goes through `superpowers:test-driven-development`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a React Native app complete a Shopify Magic Checkout end-to-end in one SDK call — `RazorpayCheckout.openMagicCheckout({ key, storefront_access_token, cart_id })`.

**Architecture:** The SDK is the orchestrator, exactly as `magic-plugins` is on web. It makes one call to a new `1cc-consumer-app` endpoint to get a Razorpay `order_id`, opens the **existing** native `open({ key, order_id })` path, and on payment success calls the Shopify complete endpoint. No native code changes. **No `checkout` (FE) changes.** No Shopify cart data ever reaches the device.

**Tech Stack:** Go 1.x / gin / gomock (`1cc-consumer-app`); JavaScript (CommonJS-transpiled ES modules) / Jest / Babel (`react-native-razorpay`). No new runtime dependencies in the SDK — `fetch` is provided by React Native.

**Spec:** `docs/superpowers/specs/2026-08-28-rn-magic-shopify-design.md` (v7), which supersedes the architecture sections of `2026-08-25-rn-magic-shopify-design.md` (aidocs `doc_nlfwhc7wob4hgy7i`, v6).

**Repositories in scope:**

| Repo | Path | Work |
|---|---|---|
| `1cc-consumer-app` | `/Users/n.maneeshgupta/Documents/Codes/1cc-consumer-app` | Tasks 1–4: one new endpoint |
| `react-native-razorpay` | `/Users/n.maneeshgupta/Documents/Codes/react-native-razorpay` | Tasks 5–13: test infra + orchestrator |
| `checkout` (FE) | — | **No changes.** See Task 0 |

---

## Global Constraints

Every task's requirements implicitly include this section.

**Both repos**

- Log/event names are `UPPER_SNAKE_CASE` in `ACTION_STATUS` form with the specific cause in a queryable `reason` field — never baked into the name. `FETCH_CONFIGS_SUCCESS` / `FETCH_CONFIGS_FAILED` with `reason=timeout`, not `FETCH_CONFIGS_TIMEOUT_FAILED`.
- Comments explain the business **why** and on-call context, never the mechanical what.
- Tests are table-driven, `map[string]struct{...}` (Go) or `Object.entries` over a map (JS), keyed `"should X then Y"` so any single subtest runs in isolation.
- Split files by functionality. No catch-all `helper.go`, `utils.js` or `magic.js`.

**`1cc-consumer-app`**

- Business/semantic validation goes in the **service layer** via `request.Validate(ctx)`. Controllers do transport-level parsing only.
- Never log or return a Shopify credential, `storefront_access_token`, raw PII, or cart contents.
- `ShopName` is **always** `*merchantConfig.ShopId`. Never from the request body. A client-supplied token must never be able to redirect an outbound call at another shop.
- After changing any interface with a generated mock, run `make mock-gen`.
- Run `make test-unit` before every commit.

**`react-native-razorpay`**

- **No new runtime dependencies.** Dev-only additions allowed. Never add `react-native-webview` or any storage library.
- **`open()`'s public behaviour must not change** — including that listeners are removed after the first success, and that `successCallback`/`errorCallback` take precedence over the promise.
- **Never send a monetary amount, line item, or cart object** in any request the SDK constructs, and never accept one as an option.
- **Never call Shopify from the SDK.**
- `src/magic/core/` must not `import` or `require` `react-native`, directly or transitively. Task 9 adds a test that enforces this.
- Base URL: `https://api.razorpay.com/v1`.
- Phase-2 modal options are exactly `{ key, order_id, one_click_checkout: true }`. No `shopify_cart`, no `magic_shop_id`.
- Phase-3 client budget: **8000 ms** total wall clock, capped exponential backoff on 5xx, initial delay 500 ms, cap 2000 ms.
- Native error codes, verified against `com.razorpay:standard-core` 1.7.18: `PAYMENT_CANCELED = 0`, `NETWORK_ERROR = 2`, `INVALID_OPTIONS = 3`, `TLS_ERROR = 6`, `INCOMPATIBLE_PLUGIN = 7`.
- **Lock files:** `.gitignore` carries `*-lock.json`, so `package-lock.json` is never committed — `yarn.lock` is the tracked one. In this environment `npm install` is aliased to a `pmg npm` wrapper that rewrites `yarn.lock` as a side effect; after any `npm install`, run `git status` and `git checkout -- yarn.lock` if it was touched, before staging anything.

---

## File Structure

### `1cc-consumer-app`

| File | Responsibility |
|---|---|
| `pkg/shopify/client/graphql/queries.go` | **modify** — add `GetMobileCartDetailsQuery()` |
| `internal/gateway/shopify/checkout/dtos/response/mobilecart.go` | **create** — `MobileCartResponse` and children |
| `internal/gateway/shopify/checkout/mobilecart.go` | **create** — `GetMobileCartDetails` gateway method |
| `internal/gateway/shopify/checkout/interfaces/interfaces.go` | **modify** — add `GetMobileCartDetails` to `ICheckoutGateway` |
| `internal/checkout/mobiletransformers.go` | **create** — Storefront cart → `dtos.Cart` mapping |
| `internal/checkout/dtos/mobile.go` | **create** — `MobileInitRequest` + `Validate` |
| `internal/checkout/mobileinit.go` | **create** — `MobileInit` service method |
| `internal/checkout/interfaces/interfaces.go` | **modify** — add `MobileInit` to `IService` |
| `internal/controllers/checkout/mobile.go` | **create** — `MobileInit` controller |
| `internal/routing/routercx/v1/checkout.go` | **modify** — register `POST /shopify/init` |
| `internal/tracecodes/*.go` | **modify** — new trace codes |

Mapping lives in `mobiletransformers.go`, not `common.go` — the repo/DTO-transform convention.

### `react-native-razorpay`

| File | Responsibility |
|---|---|
| `babel.config.js` | **create** — Babel presets for Jest |
| `jest.config.js` | **create** — Jest config, maps `react-native` to the manual mock |
| `__mocks__/react-native.js` | **create** — minimal `NativeModules` + `NativeEventEmitter` doubles |
| `__tests__/helpers/suite.js` | **create** — suite factory returning a freshly-loaded SDK |
| `__tests__/open.regression.test.js` | **create** — characterisation tests locking `open()` |
| `src/internal/checkoutSession.js` | **create** — extracted listener wiring shared by `open()` and Magic |
| `src/magic/core/errors.js` | **create** — `MagicCheckoutError` + code taxonomy |
| `src/magic/core/endpoints.js` | **create** — paths and the Splitz-driven complete-route choice |
| `src/magic/core/client.js` | **create** — the two HTTP calls, timeouts, outcome classification |
| `src/magic/core/openMagicCheckout.js` | **create** — the three-phase orchestrator |
| `src/magic/core/index.js` | **create** — `createMagicCheckout({ host, http })` factory |
| `src/magic/adapters/reactNative.js` | **create** — `host` + `http` bound to the RN bridge |
| `src/magic/core/__tests__/*.test.js` | **create** — unit, contract and orchestrator suites |
| `RazorpayCheckout.js` | **modify** — delegate to `checkoutSession`, export `openMagicCheckout` |
| `src/types.ts` | **modify** — add Magic types |
| `package.json` | **modify** — devDependencies + `test` script |
| `README.md` | **modify** — Magic Checkout section |

---

## Task 0: Verify the design on device — BLOCKING, no code

This is the only check that can invalidate the architecture. Do it first. It needs no new code in any repo.

The whole plan rests on: *Magic renders in the native SDK WebView given `order_id` alone, for a 1CC-enabled merchant.* That is derived from `checkout` FE source, not observed:

- `isMagic()` returns true via `hasLineItemsTotal` from the order plus the server-side `hasFeature('one_click_checkout')` — `app/v2/modules/magic/common/helpers/isMagic.ts:20,22,26`
- the Magic UI renders line items from `prefsOrder.line_items` / `line_items_total` when not in lite flow — `app/v2/modules/main-modal/helpers/magic.ts:176-180`
- `shouldCreateShopifyCheckout()` / `shouldCreateShopifyOrder()` both return false, so `checkout.js` will **not** re-create the order — `app/v2/modules/magic/common/helpers/index.ts:316-330`
- serviceability resolves to `'orderId'`, never touching `shopify_cart` — `app/v2/modules/magic/common/helpers/compute-shipping-method.ts:10-28`

**Steps**

- [ ] **Step 1: Get a 1CC order**

Ask the Magic Checkout team for a 1CC-enabled **test** merchant key and create one Shopify Magic order by any existing means (web storefront is fine). Record its `order_id` and `key`.

- [ ] **Step 2: Open it from the sample app**

In `sampleApps/`, replace the options passed to `RazorpayCheckout.open` with exactly:

```js
RazorpayCheckout.open({
  key: '<test key_id>',
  order_id: '<order_id from step 1>',
  one_click_checkout: true,
})
  .then((d) => console.log('SUCCESS', d))
  .catch((e) => console.log('ERROR', e));
```

- [ ] **Step 3: Record the result on both platforms**

Run on Android and iOS. Write down, for each:

1. Does the **Magic UI** render — address form, shipping options, coupon field? (Not the standard checkout method list.)
2. Is the amount correct and non-zero?
3. Do shipping options load after entering a serviceable pincode?

- [ ] **Step 4: Gate**

All three yes on both platforms → the architecture holds. Proceed to Task 1.

Any no → **stop and escalate.** Do not work around it. A "no" means `checkout.js` needs a change and the plan's shape changes; re-open the design record §5.2/§5.3 rather than patching. Record which of the four bullets above was false.

---

# Repo A — `1cc-consumer-app`

Work from `/Users/n.maneeshgupta/Documents/Codes/1cc-consumer-app` on a feature branch off `master`. Load `.agents/skills/repo-skill/SKILL.md`, `.agents/skills/code-review/SKILL.md` and `.slash/reviewer-memory/learnings.yaml` before writing code, per this repo's `AGENTS.md`.

## Task 1: Mobile cart Storefront query and gateway method

Read AppBrew's Shopify cart using **their** Storefront access token.

A separate query rather than extending `GetShopifyCartDetailsMutation()` (`pkg/shopify/client/graphql/queries.go:268`): that one is shared with the coupons path, and widening its selection set changes the Storefront response for existing callers and requires their token scopes to cover the new fields.

**Files:**
- Create: `internal/gateway/shopify/checkout/dtos/response/mobilecart.go`
- Create: `internal/gateway/shopify/checkout/mobilecart.go`
- Modify: `pkg/shopify/client/graphql/queries.go`
- Modify: `internal/gateway/shopify/checkout/interfaces/interfaces.go`
- Test: `internal/gateway/shopify/checkout/mobilecart_slit_test.go`

**Interfaces:**
- Consumes: `client.NewClient(ctx, models.Credentials, *hystrix.Client)`, `shopifyClient.MakeStorefrontRequest(models.GraphQLRequest)`
- Produces: `ICheckoutGateway.GetMobileCartDetails(ctx context.Context, credentials *models.Credentials, cartID string) (*response.MobileCartResponse, errors.IError)`

- [ ] **Step 1: Add the response DTO**

Create `internal/gateway/shopify/checkout/dtos/response/mobilecart.go`:

```go
package response

// MobileCartResponse models the Storefront `cart(id:)` read used by the native
// Magic flow. It is deliberately separate from the coupon CheckoutResponse:
// that type is shaped for a Checkout node and is shared with the coupons path,
// so widening it would change behaviour for callers we are not touching.
type MobileCartResponse struct {
	Data *MobileCartData `json:"data"`
}

type MobileCartData struct {
	Cart *MobileCart `json:"cart"`
}

type MobileCart struct {
	Cost  *MobileCartCost  `json:"cost"`
	Note  *string          `json:"note"`
	Lines *MobileCartLines `json:"lines"`
}

type MobileCartCost struct {
	TotalAmount *MobileMoney `json:"totalAmount"`
}

type MobileMoney struct {
	Amount       string `json:"amount"`
	CurrencyCode string `json:"currencyCode"`
}

type MobileCartLines struct {
	Edges []MobileCartLineEdge `json:"edges"`
}

type MobileCartLineEdge struct {
	Node *MobileCartLine `json:"node"`
}

type MobileCartLine struct {
	Quantity    int64              `json:"quantity"`
	Merchandise *MobileMerchandise `json:"merchandise"`
}

type MobileMerchandise struct {
	ID               string         `json:"id"`
	SKU              *string        `json:"sku"`
	Title            *string        `json:"title"`
	Weight           *float64       `json:"weight"`
	WeightUnit       *string        `json:"weightUnit"`
	RequiresShipping *bool          `json:"requiresShipping"`
	Taxable          *bool          `json:"taxable"`
	Price            *MobileMoney   `json:"price"`
	Image            *MobileImage   `json:"image"`
	Product          *MobileProduct `json:"product"`
}

type MobileImage struct {
	URL *string `json:"url"`
}

type MobileProduct struct {
	ID          string  `json:"id"`
	Title       *string `json:"title"`
	ProductType *string `json:"productType"`
	Description *string `json:"description"`
}
```

- [ ] **Step 2: Add the GraphQL query**

Append to `pkg/shopify/client/graphql/queries.go`:

```go
// GetMobileCartDetailsQuery reads a Storefront cart for the native Magic flow.
// Selects the superset of fields dtos.Item carries so the mobile mapper never
// has to guess: image, productType, taxable and description are absent from
// GetShopifyCartDetailsMutation and are why this is a separate query.
func GetMobileCartDetailsQuery() string {
	return `query MobileCart($cartID: ID!) {
    cart(id: $cartID) {
        note
        cost {
            totalAmount { amount currencyCode }
        }
        lines(first: 250) {
            edges {
                node {
                    quantity
                    merchandise {
                        ... on ProductVariant {
                            id
                            sku
                            title
                            weight
                            weightUnit
                            requiresShipping
                            taxable
                            price { amount currencyCode }
                            image { url }
                            product {
                                id
                                title
                                productType
                                description
                            }
                        }
                    }
                }
            }
        }
    }
}`
}
```

- [ ] **Step 3: Add the interface method**

In `internal/gateway/shopify/checkout/interfaces/interfaces.go`, add to `ICheckoutGateway` immediately after `GetCartByStoreFrontId`:

```go
	GetMobileCartDetails(ctx context.Context,
		credentials *models.Credentials,
		cartID string,
	) (*response.MobileCartResponse, errors.IError)
```

- [ ] **Step 4: Regenerate mocks**

```bash
make mock-gen
```

- [ ] **Step 5: Write the failing SLIT test**

Create `internal/gateway/shopify/checkout/mobilecart_slit_test.go`. Model it on the existing `TestCheckoutGatewayStorefrontReadPathsSLIT` in `checkout_slit_test.go` — read that file first and mirror its `testkit` setup, build tag and stub-server shape exactly.

```go
//go:build slit

package checkout

import (
	"context"
	"net/http"
	"testing"

	"github.com/razorpay/1cc-consumer-app/pkg/shopify/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMobileCartGatewayReadSLIT(t *testing.T) {
	tests := map[string]struct {
		status      int
		body        string
		wantErr     bool
		wantVariant string
		wantQty     int64
	}{
		"should return mapped variant and quantity then no error": {
			status: http.StatusOK,
			body: `{"data":{"cart":{"note":"gift","cost":{"totalAmount":{"amount":"499.00","currencyCode":"INR"}},
				"lines":{"edges":[{"node":{"quantity":2,"merchandise":{"id":"gid://shopify/ProductVariant/42",
				"sku":"SKU1","title":"Small","taxable":true,"price":{"amount":"249.50","currencyCode":"INR"},
				"product":{"id":"gid://shopify/Product/7","title":"Tee","productType":"Apparel"}}}}]}}}}`,
			wantVariant: "gid://shopify/ProductVariant/42",
			wantQty:     2,
		},
		"should map unauthorized then return authentication error": {
			status:  http.StatusUnauthorized,
			body:    `{"errors":["unauthorized"]}`,
			wantErr: true,
		},
	}

	for name, tc := range tests {
		tc := tc
		t.Run(name, func(t *testing.T) {
			gw, teardown := newStubbedCheckoutGateway(t, "/api/2023-10/graphql.json", tc.status, tc.body)
			defer teardown()

			res, err := gw.GetMobileCartDetails(context.Background(),
				&models.Credentials{ShopName: "teststore", StorefrontAccessToken: "storefront-token"},
				"gid://shopify/Cart/c1-abc")

			if tc.wantErr {
				require.NotNil(t, err)
				return
			}
			require.Nil(t, err)
			require.NotNil(t, res.Data.Cart)
			line := res.Data.Cart.Lines.Edges[0].Node
			assert.Equal(t, tc.wantVariant, line.Merchandise.ID)
			assert.Equal(t, tc.wantQty, line.Quantity)
		})
	}
}
```

`newStubbedCheckoutGateway` is the helper you extract from the existing SLIT file's setup in the next step.

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd /Users/n.maneeshgupta/Documents/Codes/1cc-consumer-app
APP_ENV=slit_local WORKDIR=$(pwd) go test -tags slit ./internal/gateway/shopify/checkout/... -run TestMobileCartGatewayReadSLIT -v
```
Expected: FAIL — `gw.GetMobileCartDetails undefined` and `newStubbedCheckoutGateway undefined`.

- [ ] **Step 7: Extract the stub helper**

In `checkout_slit_test.go`, factor the stub-server construction used by `TestCheckoutGatewayStorefrontReadPathsSLIT` into:

```go
func newStubbedCheckoutGateway(t *testing.T, path string, status int, body string) (interfaces.ICheckoutGateway, func())
```

Leave the existing tests calling it, so they still pass unchanged. This is the `testData` util-function convention — shared setup behind one factory rather than duplicated per test.

- [ ] **Step 8: Implement the gateway method**

Create `internal/gateway/shopify/checkout/mobilecart.go`. Error mapping mirrors `GetCartByStoreFrontId` (`checkout.go:106-150`) so on-call sees the same classes from both read paths.

```go
package checkout

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/razorpay/1cc-consumer-app/internal/gateway/shopify/checkout/dtos/response"
	"github.com/razorpay/1cc-consumer-app/internal/tracecodes"
	"github.com/razorpay/1cc-consumer-app/pkg/errors/errorclass"
	"github.com/razorpay/1cc-consumer-app/pkg/errors/errorcodes"
	"github.com/razorpay/1cc-consumer-app/pkg/logger"
	"github.com/razorpay/1cc-consumer-app/pkg/shopify/client"
	shopifyqueries "github.com/razorpay/1cc-consumer-app/pkg/shopify/client/graphql"
	"github.com/razorpay/1cc-consumer-app/pkg/shopify/models"
	"github.com/razorpay/goutils/errors"
)

// GetMobileCartDetails reads the cart the mobile app created under ITS OWN
// Storefront app. That is why the caller passes the app's storefront token
// rather than the merchant's: a cart is only readable by the Storefront app
// that created it. ShopName still comes from merchant config, never the
// request, so a supplied token cannot point this call at another shop.
func (c *checkoutGateway) GetMobileCartDetails(
	ctx context.Context,
	credentials *models.Credentials,
	cartID string,
) (*response.MobileCartResponse, errors.IError) {
	shopifyClient := client.NewClient(ctx, *credentials, c.client)

	res, statusCode, _, err := shopifyClient.MakeStorefrontRequest(models.GraphQLRequest{
		Query:     shopifyqueries.GetMobileCartDetailsQuery(),
		Variables: map[string]interface{}{"cartID": cartID},
	})

	if statusCode != http.StatusOK {
		logger.Logger(ctx).WithField("status_code", statusCode).
			Error(tracecodes.MobileCartFetchFailed)
		switch statusCode {
		case http.StatusUnauthorized, http.StatusForbidden:
			return nil, errorclass.AuthenticationError.
				New(errorcodes.AuthenticationError).
				Wrap(fmt.Errorf("unauthorized")).Report(ctx)
		case http.StatusBadRequest:
			return nil, errorclass.BadRequestError.
				New(errorcodes.BadRequestError).
				Wrap(fmt.Errorf("bad request")).Report(ctx)
		default:
			return nil, errorclass.GatewayError.
				New(errorcodes.ShopifyGatewayError).
				WithInternalMetadata(map[string]string{"status": strconv.Itoa(statusCode)}).
				Wrap(fmt.Errorf("unknown")).Report(ctx)
		}
	}
	if err != nil {
		logger.Logger(ctx).WithError(err).Error(tracecodes.MobileCartFetchFailed)
		return nil, errorclass.GatewayError.
			New(errorcodes.ShopifyGatewayError).Wrap(err).Report(ctx)
	}

	var parsed response.MobileCartResponse
	if uerr := json.Unmarshal(res, &parsed); uerr != nil {
		return nil, errorclass.InternalServerError.
			New(errorcodes.JSONUnMarshalError).Wrap(uerr).Report(ctx)
	}
	if parsed.Data == nil || parsed.Data.Cart == nil {
		// A 200 with a null cart means the id is unknown to this Storefront app —
		// almost always a cart created by a different app, or an expired cart.
		return nil, errorclass.NotFoundError.
			New(errorcodes.NotFoundError).
			Wrap(fmt.Errorf("cart not found")).Report(ctx)
	}
	logger.Logger(ctx).Info(tracecodes.MobileCartFetchSuccess)
	return &parsed, nil
}
```

- [ ] **Step 9: Add trace codes**

Find the file in `internal/tracecodes/` that holds the existing `ShopifyCreateCheckoutStep` and `FetchCartDetails` constants and add alongside them:

```go
	MobileCartFetchSuccess = "MOBILE_CART_FETCH_SUCCESS"
	MobileCartFetchFailed  = "MOBILE_CART_FETCH_FAILED"
```

If `errorcodes.NotFoundError` does not exist, use the constant the existing `FetchCart` not-found path uses in `internal/controllers/checkout/checkout.go:217`.

- [ ] **Step 10: Run the test to verify it passes**

```bash
APP_ENV=slit_local WORKDIR=$(pwd) go test -tags slit ./internal/gateway/shopify/checkout/... -run TestMobileCartGatewayReadSLIT -v
```
Expected: PASS, both subtests. Then confirm nothing regressed:
```bash
APP_ENV=slit_local WORKDIR=$(pwd) go test -tags slit ./internal/gateway/shopify/checkout/... -v
```

- [ ] **Step 11: Commit**

```bash
git add pkg/shopify/client/graphql/queries.go \
        internal/gateway/shopify/checkout/ \
        internal/tracecodes/ test/mock/
git commit -m "feat(checkout): add mobile Storefront cart read for native Magic flow"
```

---

## Task 2: Storefront cart → `dtos.Cart` mapper

Turn the Storefront read into the `/cart.js`-shaped `dtos.Cart` that `CreateCheckout` already validates and consumes.

Two conversions carry real consequences, so they get their own tests:
- `gid://shopify/ProductVariant/42` → `int64(42)`. `dtos.Item.VariantId` and `ProductId` are `int64`; Storefront returns global IDs.
- `gid://shopify/Cart/c1-abc` → `"c1-abc"`. `storeCartTokenToUniqueIDMapping` (`internal/checkout/checkout.go:164`) keys on the token, and it is **service-level**, so the mobile path does hit it — a full gid would corrupt that mapping for every mobile cart.

  > **Correction, verified during execution.** An earlier draft also cited `observeCartProperties`' `strings.HasPrefix(token, "c1-")` check. That function is **controller-only** (`internal/controllers/checkout/checkout.go:89`), and `MobileInit` calls the *service* `CreateCheckout` directly, so it never runs for mobile carts. That is not a defect — the metric exists to detect `/cart.js` schema drift from the web plugin, which cannot happen to a server-built cart. But it is not a justification for the token strip. `storeCartTokenToUniqueIDMapping` is.

**Files:**
- Create: `internal/checkout/mobiletransformers.go`
- Test: `internal/checkout/mobiletransformers_test.go`

**Interfaces:**
- Consumes: `response.MobileCartResponse` (Task 1)
- Produces:
  - `func numericIDFromGID(gid string) int64`
  - `func cartTokenFromGID(gid string) string`
  - `func toCartDTO(cartID string, sf *response.MobileCart) *dtos.Cart`

- [ ] **Step 1: Write the failing tests**

Create `internal/checkout/mobiletransformers_test.go`:

```go
//go:build unit

package checkout

import (
	"testing"

	"github.com/razorpay/1cc-consumer-app/internal/gateway/shopify/checkout/dtos/response"
	"github.com/stretchr/testify/assert"
)

func strPtr(s string) *string    { return &s }
func f64Ptr(f float64) *float64  { return &f }
func boolPtr(b bool) *bool       { return &b }

func TestNumericIDFromGID(t *testing.T) {
	tests := map[string]struct {
		gid  string
		want int64
	}{
		"should extract the trailing id then return it":        {"gid://shopify/ProductVariant/42", 42},
		"should extract a product id then return it":           {"gid://shopify/Product/7", 7},
		"should return zero when the gid has no numeric tail":  {"gid://shopify/ProductVariant/abc", 0},
		"should return zero when the gid is empty":             {"", 0},
	}
	for name, tc := range tests {
		tc := tc
		t.Run(name, func(t *testing.T) {
			assert.Equal(t, tc.want, numericIDFromGID(tc.gid))
		})
	}
}

func TestCartTokenFromGID(t *testing.T) {
	tests := map[string]struct {
		gid  string
		want string
	}{
		"should strip the gid prefix then return the bare token": {"gid://shopify/Cart/c1-abc123", "c1-abc123"},
		"should return the input unchanged when already bare":    {"c1-abc123", "c1-abc123"},
		"should return empty when the input is empty":            {"", ""},
	}
	for name, tc := range tests {
		tc := tc
		t.Run(name, func(t *testing.T) {
			assert.Equal(t, tc.want, cartTokenFromGID(tc.gid))
		})
	}
}

func TestToCartDTO(t *testing.T) {
	sf := &response.MobileCart{
		Note: strPtr("leave at door"),
		Cost: &response.MobileCartCost{
			TotalAmount: &response.MobileMoney{Amount: "499.00", CurrencyCode: "INR"},
		},
		Lines: &response.MobileCartLines{Edges: []response.MobileCartLineEdge{{
			Node: &response.MobileCartLine{
				Quantity: 2,
				Merchandise: &response.MobileMerchandise{
					ID:               "gid://shopify/ProductVariant/42",
					SKU:              strPtr("SKU1"),
					Title:            strPtr("Small"),
					Weight:           f64Ptr(1.5),
					WeightUnit:       strPtr("KILOGRAMS"),
					RequiresShipping: boolPtr(true),
					Taxable:          boolPtr(true),
					Price:            &response.MobileMoney{Amount: "249.50", CurrencyCode: "INR"},
					Image:            &response.MobileImage{URL: strPtr("https://cdn/img.png")},
					Product: &response.MobileProduct{
						ID:          "gid://shopify/Product/7",
						Title:       strPtr("Tee"),
						ProductType: strPtr("Apparel"),
						Description: strPtr("A tee"),
					},
				},
			},
		}}},
	}

	got := toCartDTO("gid://shopify/Cart/c1-abc123", sf)

	t.Run("should strip the cart gid then set a bare c1 token", func(t *testing.T) {
		assert.Equal(t, "c1-abc123", *got.Token)
	})
	t.Run("should convert the major-unit total then store paise", func(t *testing.T) {
		assert.Equal(t, int64(49900), got.TotalPrice)
	})
	t.Run("should carry the currency then set INR", func(t *testing.T) {
		assert.Equal(t, "INR", got.Currency)
	})
	t.Run("should map the variant gid then set a numeric variant id", func(t *testing.T) {
		assert.Equal(t, int64(42), got.Items[0].VariantId)
		assert.Equal(t, int64(7), got.Items[0].ProductId)
	})
	t.Run("should convert the line price then store paise", func(t *testing.T) {
		assert.Equal(t, int64(24950), got.Items[0].Price)
	})
	t.Run("should convert kilograms then store grams", func(t *testing.T) {
		assert.Equal(t, int64(1500), got.Items[0].Grams)
	})
	t.Run("should carry the descriptive fields then populate them", func(t *testing.T) {
		assert.Equal(t, "SKU1", got.Items[0].Sku)
		assert.Equal(t, "Tee", got.Items[0].Title)
		assert.Equal(t, "Small", got.Items[0].Variant)
		assert.Equal(t, "Apparel", got.Items[0].ProductType)
		assert.Equal(t, "https://cdn/img.png", got.Items[0].Image)
		assert.True(t, got.Items[0].Taxable)
		assert.True(t, got.Items[0].RequireShipping)
		assert.Equal(t, int64(2), got.Items[0].Quantity)
	})
	t.Run("should tolerate a nil merchandise then skip the line", func(t *testing.T) {
		partial := &response.MobileCart{
			Cost:  &response.MobileCartCost{TotalAmount: &response.MobileMoney{Amount: "0.00", CurrencyCode: "INR"}},
			Lines: &response.MobileCartLines{Edges: []response.MobileCartLineEdge{{Node: &response.MobileCartLine{Quantity: 1}}}},
		}
		assert.Len(t, toCartDTO("gid://shopify/Cart/c1-x", partial).Items, 0)
	})
}
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /Users/n.maneeshgupta/Documents/Codes/1cc-consumer-app
go test -tags unit ./internal/checkout/... -run 'TestNumericIDFromGID|TestCartTokenFromGID|TestToCartDTO' -v
```
Expected: FAIL — `undefined: numericIDFromGID`.

- [ ] **Step 3: Implement the mapper**

Create `internal/checkout/mobiletransformers.go`:

```go
package checkout

import (
	"math"
	"strconv"
	"strings"

	"github.com/razorpay/1cc-consumer-app/internal/checkout/dtos"
	"github.com/razorpay/1cc-consumer-app/internal/gateway/shopify/checkout/dtos/response"
)

// Storefront returns global IDs ("gid://shopify/ProductVariant/42") while
// dtos.Item carries int64 ids, because the /cart.js shape it mirrors is the
// REST one. A gid we cannot parse yields 0 rather than an error: MCS reprices
// from Shopify regardless, so a bad id fails loudly downstream instead of
// blocking cart construction here.
func numericIDFromGID(gid string) int64 {
	idx := strings.LastIndex(gid, "/")
	if idx < 0 || idx+1 >= len(gid) {
		return 0
	}
	n, err := strconv.ParseInt(gid[idx+1:], 10, 64)
	if err != nil {
		return 0
	}
	return n
}

// observeCartProperties and the cart-token->unique-id mapping both key on a
// bare "c1-" token. Passing the full gid through would silently disable
// cart-property metrics for every mobile cart, so strip the prefix here.
func cartTokenFromGID(gid string) string {
	idx := strings.LastIndex(gid, "/")
	if idx < 0 || idx+1 >= len(gid) {
		return gid
	}
	return gid[idx+1:]
}

// Shopify money is a major-unit decimal string; the cart DTO is in the minor
// unit, matching what /cart.js gives the web plugin.
func toMinorUnit(amount string) int64 {
	f, err := strconv.ParseFloat(amount, 64)
	if err != nil {
		return 0
	}
	return int64(math.Round(f * 100))
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefBool(b *bool) bool {
	return b != nil && *b
}

// PG Router stores weight in grams regardless of the store's Shopify config,
// which is why CreateOrderAndGetPreferences normalises KILOGRAMS downstream.
// We normalise at the source so the cart is already consistent.
func toGrams(weight *float64, unit *string) int64 {
	if weight == nil {
		return 0
	}
	if unit != nil && *unit == "KILOGRAMS" {
		return int64(math.Round(*weight * 1000))
	}
	return int64(math.Round(*weight))
}

// toCartDTO converts the Storefront cart read into the /cart.js-shaped cart
// that CreateCheckout validates. No value here is client-supplied: everything
// comes from Shopify via the gateway, which is what keeps pricing authority
// server-side.
func toCartDTO(cartID string, sf *response.MobileCart) *dtos.Cart {
	token := cartTokenFromGID(cartID)
	cart := &dtos.Cart{
		Token: &token,
		Items: []dtos.Item{},
	}
	if sf == nil {
		return cart
	}
	if sf.Note != nil {
		cart.Note = *sf.Note
	}
	if sf.Cost != nil && sf.Cost.TotalAmount != nil {
		cart.TotalPrice = toMinorUnit(sf.Cost.TotalAmount.Amount)
		cart.Currency = sf.Cost.TotalAmount.CurrencyCode
	}
	if sf.Lines == nil {
		return cart
	}
	for _, edge := range sf.Lines.Edges {
		if edge.Node == nil || edge.Node.Merchandise == nil {
			continue
		}
		m := edge.Node.Merchandise
		item := dtos.Item{
			VariantId:       numericIDFromGID(m.ID),
			Quantity:        edge.Node.Quantity,
			Sku:             derefStr(m.SKU),
			Variant:         derefStr(m.Title),
			Taxable:         derefBool(m.Taxable),
			RequireShipping: derefBool(m.RequiresShipping),
			Grams:           toGrams(m.Weight, m.WeightUnit),
		}
		if m.Price != nil {
			item.Price = toMinorUnit(m.Price.Amount)
		}
		if m.Image != nil {
			item.Image = derefStr(m.Image.URL)
		}
		if m.Product != nil {
			item.ProductId = numericIDFromGID(m.Product.ID)
			item.Title = derefStr(m.Product.Title)
			item.ProductType = derefStr(m.Product.ProductType)
			item.ProductDescription = derefStr(m.Product.Description)
		}
		cart.Items = append(cart.Items, item)
	}
	return cart
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
go test -tags unit ./internal/checkout/... -run 'TestNumericIDFromGID|TestCartTokenFromGID|TestToCartDTO' -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/checkout/mobiletransformers.go internal/checkout/mobiletransformers_test.go
git commit -m "feat(checkout): map Storefront cart to cart DTO for native Magic flow"
```

---

## Task 3: `MobileInit` service method

Compose the two existing service methods. This is the whole point of the endpoint: `CreateOrderAndGetPreferences` needs only `shopify_checkout_id` + `key_id` and re-reads cart and checkout from the cache `CreateCheckout` wrote (`internal/checkout/checkout.go:555`), so they chain with no new state.

**Files:**
- Create: `internal/checkout/dtos/mobile.go`
- Create: `internal/checkout/mobileinit.go`
- Modify: `internal/checkout/interfaces/interfaces.go`
- Test: `internal/checkout/mobileinit_test.go`

**Interfaces:**
- Consumes: `toCartDTO` (Task 2); `ICheckoutGateway.GetMobileCartDetails` (Task 1); existing `s.CreateCheckout`, `s.CreateOrderAndGetPreferences`, `s.merchantConfigService.GetFromCache`, `s.getShopifyCredentialsFromMerchantConfig`
- Produces: `IService.MobileInit(ctx context.Context, request *dtos.MobileInitRequest) (*checkoutdtos.CreateOrderAndGetPreferencesResponse, errors.IError)`

- [ ] **Step 1: Add the request DTO with service-layer validation**

Create `internal/checkout/dtos/mobile.go`. Validation lives here, not the controller — the service may later be called directly.

```go
package dtos

import (
	"context"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/razorpay/1cc-consumer-app/pkg/validations"
	"github.com/razorpay/goutils/errors"
)

// MobileInitRequest is the native Magic entry point. CartID is the app's
// Storefront cart; StorefrontAccessToken is the APP's token, needed because a
// Storefront cart is only readable by the app that created it. The merchant's
// own credentials are resolved server-side from MerchantKey and are what
// create the new checkout.
type MobileInitRequest struct {
	Headers               map[string]string
	MerchantKey           string
	CartID                string `json:"cart_id"`
	StorefrontAccessToken string `json:"storefront_access_token"`
}

func (r MobileInitRequest) Validate(ctx context.Context) errors.IError {
	return validations.Validate(ctx, &r,
		validation.Field(&r.MerchantKey, validation.Required),
		validation.Field(&r.CartID, validation.Required),
		validation.Field(&r.StorefrontAccessToken, validation.Required),
	)
}
```

- [ ] **Step 2: Add the interface method**

In `internal/checkout/interfaces/interfaces.go`, add to `IService` after `CreateOrderAndGetPreferences`:

```go
	MobileInit(
		ctx context.Context,
		request *dtos.MobileInitRequest,
	) (*checkoutdtos.CreateOrderAndGetPreferencesResponse, errors.IError)
```

- [ ] **Step 3: Unbreak the hand-written stub, then regenerate mocks**

`internal/controllers/checkout/checkout_test.go` defines a hand-written `stubCheckoutService` implementing `IService`. Widening the interface makes that whole test package fail to compile, so fix it now — before `make test-unit` in Step 8 trips over it. Add two fields to the struct:

```go
	mobileInitResult *publicdtos.CreateOrderAndGetPreferencesResponse
	mobileInitErr    errors.IError
```

and a method beside the other no-ops:

```go
func (s *stubCheckoutService) MobileInit(ctx context.Context, req *checkoutreqdtos.MobileInitRequest) (*publicdtos.CreateOrderAndGetPreferencesResponse, errors.IError) {
	return s.mobileInitResult, s.mobileInitErr
}
```

Then:

```bash
make mock-gen
go build ./...
```
Expected: builds clean. If another type also implements `IService`, the compiler names it — add the method there too.

- [ ] **Step 4: Write the failing test**

Create `internal/checkout/mobileinit_test.go`. Read `internal/checkout/checkout_unit_test.go` first and reuse its suite construction verbatim — do not invent a second way to build the service.

```go
//go:build unit

package checkout

import (
	"context"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/razorpay/1cc-consumer-app/internal/checkout/dtos"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMobileInit(t *testing.T) {
	tests := map[string]struct {
		req     *dtos.MobileInitRequest
		prepare func(ts *mobileInitSuite)
		wantErr bool
	}{
		"should chain cart read checkout and order then return the passthrough": {
			req: validMobileInitRequest(),
			prepare: func(ts *mobileInitSuite) {
				ts.expectMerchantConfig()
				ts.expectCartRead()
				ts.expectCreateCheckout("chk_1")
				ts.expectCreateOrder("chk_1", []byte(`{"order_id":"order_1"}`))
			},
		},
		"should reject a blank cart id then not call any gateway": {
			req:     &dtos.MobileInitRequest{MerchantKey: "rzp_test_x", StorefrontAccessToken: "t"},
			prepare: func(ts *mobileInitSuite) {},
			wantErr: true,
		},
		"should reject a blank storefront token then not call any gateway": {
			req:     &dtos.MobileInitRequest{MerchantKey: "rzp_test_x", CartID: "gid://shopify/Cart/c1-a"},
			prepare: func(ts *mobileInitSuite) {},
			wantErr: true,
		},
		"should stop when the cart read fails then not create a checkout": {
			req: validMobileInitRequest(),
			prepare: func(ts *mobileInitSuite) {
				ts.expectMerchantConfig()
				ts.expectCartReadError()
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		tc := tc
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			ts := newMobileInitSuite(t, ctrl)
			tc.prepare(ts)

			res, err := ts.svc.MobileInit(context.Background(), tc.req)

			if tc.wantErr {
				require.NotNil(t, err)
				assert.Nil(t, res)
				return
			}
			require.Nil(t, err)
			assert.JSONEq(t, `{"order_id":"order_1"}`, string(res.Response))
		})
	}
}
```

Add the suite to the same file. `NewService`'s eight parameters are fixed by `internal/checkout/checkout.go:57-67`; the only change from `checkoutServiceForUnit` (`checkout_unit_test.go:34`) is swapping the real `mockShopifyGateway()` for the generated `MockICheckoutGateway`, because we need to set an expectation on `GetMobileCartDetails`.

```go
type mobileInitSuite struct {
	t              *testing.T
	svc            *service
	merchantConfig *merchantconfigmock.MockIService
	shopifyGateway *shopifycheckoutmock.MockICheckoutGateway
	mcs            *magiccheckoutservicemock.MockIMagicCheckoutService
	splitz         *splitzservicemock.MockClient
}

func newMobileInitSuite(t *testing.T, ctrl *gomock.Controller) *mobileInitSuite {
	t.Helper()
	ts := &mobileInitSuite{
		t:              t,
		merchantConfig: merchantconfigmock.NewMockIService(ctrl),
		shopifyGateway: shopifycheckoutmock.NewMockICheckoutGateway(ctrl),
		mcs:            magiccheckoutservicemock.NewMockIMagicCheckoutService(ctrl),
		splitz:         splitzservicemock.NewMockClient(ctrl),
	}
	svc, err := NewService(
		ts.merchantConfig,
		ts.shopifyGateway,
		mockApiGatewayService(),
		cache.NewMockCache(),
		analyticsmock.NewMockIService(ctrl),
		ts.mcs,
		ts.splitz,
		config.Experiments{},
	)
	require.NoError(t, err)
	ts.svc = svc
	return ts
}

func validMobileInitRequest() *dtos.MobileInitRequest {
	return &dtos.MobileInitRequest{
		MerchantKey:           "rzp_test_x",
		CartID:                "gid://shopify/Cart/c1-abc",
		StorefrontAccessToken: "sf-token",
	}
}

func (ts *mobileInitSuite) expectMerchantConfig() {
	shopID, oauth, sfToken := "teststore", "oauth", "merchant-sf-token"
	apiKey, apiSecret := "k", "s"
	ts.merchantConfig.EXPECT().
		GetFromCache(gomock.Any(), gomock.Any()).
		Return(&merchantconfigdtos.MerchantConfigData{
			MerchantId:            &TestMerchantId,
			ShopId:                &shopID,
			OAuthToken:            &oauth,
			StorefrontAccessToken: &sfToken,
			ApiKey:                &apiKey,
			ApiSecret:             &apiSecret,
		}, nil).AnyTimes()
}

func (ts *mobileInitSuite) expectCartRead() {
	ts.shopifyGateway.EXPECT().
		GetMobileCartDetails(gomock.Any(), gomock.Any(), "gid://shopify/Cart/c1-abc").
		DoAndReturn(func(_ context.Context, creds *models.Credentials, _ string) (*gatewayresponse.MobileCartResponse, gerrors.IError) {
			// The security boundary this endpoint depends on: the shop is
			// pinned from merchant config, only the token comes from the caller.
			require.Equal(ts.t, "teststore", creds.ShopName)
			require.Equal(ts.t, "sf-token", creds.StorefrontAccessToken)
			return mobileCartFixture(), nil
		})
}

func (ts *mobileInitSuite) expectCartReadError() {
	ts.shopifyGateway.EXPECT().
		GetMobileCartDetails(gomock.Any(), gomock.Any(), gomock.Any()).
		Return(nil, errorclass.GatewayError.New(errorcodes.ShopifyGatewayError))
}

func mobileCartFixture() *gatewayresponse.MobileCartResponse {
	amount := gatewayresponse.MobileMoney{Amount: "499.00", CurrencyCode: "INR"}
	sku, title := "SKU1", "Small"
	return &gatewayresponse.MobileCartResponse{
		Data: &gatewayresponse.MobileCartData{Cart: &gatewayresponse.MobileCart{
			Cost:  &gatewayresponse.MobileCartCost{TotalAmount: &amount},
			Lines: &gatewayresponse.MobileCartLines{Edges: []gatewayresponse.MobileCartLineEdge{{
				Node: &gatewayresponse.MobileCartLine{
					Quantity: 1,
					Merchandise: &gatewayresponse.MobileMerchandise{
						ID:    "gid://shopify/ProductVariant/42",
						SKU:   &sku,
						Title: &title,
						Price: &amount,
					},
				},
			}}},
		}},
	}
}
```

`expectCreateCheckout(checkoutID string)` and `expectCreateOrder(checkoutID string, passthrough []byte)` set expectations on `ts.mcs` and `ts.splitz`. **Do not invent these** — `internal/checkout/checkout_test.go` already exercises both underlying methods. Copy the expectation setup from its existing `CreateCheckout` test (the one asserting `mockMagicCheckoutService` around line 103) and its `CreateOrderAndGetPreferences` test (the one building `requestMCS := magiccheckoutservice.CreateOrderAndGetPreferencesRequest{...}` around line 221), then wrap each in one of these two helpers. Wrapping rather than copy-pasting per case is the repo's shared-`testData` convention.

Import aliases used above, matching `checkout_unit_test.go`'s existing block plus the gateway mock:

```go
	shopifycheckoutmock "github.com/razorpay/1cc-consumer-app/test/mock/app/gateway/shopify/checkout"
	"github.com/razorpay/1cc-consumer-app/pkg/shopify/models"
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
go test -tags unit ./internal/checkout/... -run TestMobileInit -v
```
Expected: FAIL — `ts.svc.MobileInit undefined`.

- [ ] **Step 6: Implement the service method**

Create `internal/checkout/mobileinit.go`:

```go
package checkout

import (
	"context"

	"github.com/razorpay/1cc-consumer-app/internal/checkout/dtos"
	checkoutdtos "github.com/razorpay/1cc-consumer-app/internal/dtos/checkout"
	merchantconfigdtos "github.com/razorpay/1cc-consumer-app/internal/merchantconfig/dtos"
	"github.com/razorpay/1cc-consumer-app/internal/tracecodes"
	"github.com/razorpay/1cc-consumer-app/pkg/errors/errorclass"
	"github.com/razorpay/1cc-consumer-app/pkg/errors/errorcodes"
	"github.com/razorpay/1cc-consumer-app/pkg/logger"
	"github.com/razorpay/1cc-consumer-app/pkg/shopify/models"
	"github.com/razorpay/goutils/errors"
)

const mobileInitSource = "mobile_sdk"

// MobileInit is the native Magic entry point. It exists so a mobile client
// makes ONE round trip before the modal instead of two: on a mobile network
// that latency sits directly in the user's tap-to-modal path, and composing
// here also removes any window in which the cart could drift from the order.
//
// It deliberately adds no business logic of its own — CreateCheckout and
// CreateOrderAndGetPreferences are the same calls the web path makes, so
// pricing, idempotency and order semantics stay in one place.
func (s *service) MobileInit(
	ctx context.Context,
	request *dtos.MobileInitRequest,
) (*checkoutdtos.CreateOrderAndGetPreferencesResponse, errors.IError) {
	if err := request.Validate(ctx); err != nil {
		logger.Logger(ctx).WithError(err).Error(tracecodes.MobileInitFailed)
		return nil, err
	}

	merchantConfig, err := s.merchantConfigService.GetFromCache(ctx,
		&merchantconfigdtos.GetMerchantConfigRequest{KeyId: request.MerchantKey})
	if err != nil {
		logger.Logger(ctx).WithError(err).WithField("reason", "merchant_config").
			Error(tracecodes.MobileInitFailed)
		return nil, err
	}
	if isCredentialsNil(ctx, merchantConfig, request.MerchantKey) {
		return nil, errorclass.ShopifyCredentialsNotFound.
			New(errorcodes.AuthenticationError).Report(ctx)
	}

	// ShopName is pinned to the merchant's configured shop. Only the token
	// comes from the request, so a caller cannot aim this read at another
	// store by supplying someone else's credentials.
	readCredentials := &models.Credentials{
		ShopName:              *merchantConfig.ShopId,
		StorefrontAccessToken: request.StorefrontAccessToken,
	}

	sfCart, err := s.shopifyCheckoutGateway.GetMobileCartDetails(ctx, readCredentials, request.CartID)
	if err != nil {
		logger.Logger(ctx).WithError(err).WithField("reason", "cart_read").
			Error(tracecodes.MobileInitFailed)
		return nil, err
	}

	cart := toCartDTO(request.CartID, sfCart.Data.Cart)

	checkoutRes, err := s.CreateCheckout(ctx, &dtos.CreateCheckoutRequest{
		Cart:   cart,
		Key:    &request.MerchantKey,
		Source: mobileInitSource,
	})
	if err != nil {
		logger.Logger(ctx).WithError(err).WithField("reason", "create_checkout").
			Error(tracecodes.MobileInitFailed)
		return nil, err
	}

	orderRes, err := s.CreateOrderAndGetPreferences(ctx, &dtos.CreateOrderAndGetPreferencesRequest{
		Headers:     request.Headers,
		MerchantKey: request.MerchantKey,
		Body: dtos.CreateOrderAndGetPreferencesRequestBody{
			ShopifyCheckoutId: checkoutRes.ShopifyCheckoutId,
			Platform:          mobileInitSource,
			Source:            mobileInitSource,
		},
	})
	if err != nil {
		logger.Logger(ctx).WithError(err).WithField("reason", "create_order").
			Error(tracecodes.MobileInitFailed)
		return nil, err
	}

	logger.Logger(ctx).WithField("shopify_checkout_id", checkoutRes.ShopifyCheckoutId).
		Info(tracecodes.MobileInitSuccess)
	return orderRes, nil
}
```

- [ ] **Step 7: Add trace codes**

Alongside the Task 1 codes:

```go
	MobileInitSuccess = "MOBILE_INIT_SUCCESS"
	MobileInitFailed  = "MOBILE_INIT_FAILED"
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
go test -tags unit ./internal/checkout/... -run TestMobileInit -v
make test-unit
```
Expected: PASS, all four subtests, and no regressions.

- [ ] **Step 9: Commit**

```bash
git add internal/checkout/ test/mock/
git commit -m "feat(checkout): add MobileInit composing checkout and order creation"
```

---

## Task 4: Controller and route

**Files:**
- Create: `internal/controllers/checkout/mobile.go`
- Modify: `internal/routing/routercx/v1/checkout.go`
- Test: `internal/controllers/checkout/mobile_test.go`

**Interfaces:**
- Consumes: `IService.MobileInit` (Task 3), existing `getMerchantKeyId(ctx)`, `isTestModeAndProdEnv`, `controllerutils.SetModeInContextForTestKeys`
- Produces: `POST /v1/magic/shopify/init?key_id=<key>` returning the raw preferences passthrough

- [ ] **Step 1: Write the failing controller test**

Create `internal/controllers/checkout/mobile_test.go`, mirroring the structure of the existing `checkout_test.go` in the same package:

```go
//go:build unit

package checkout

import (
	"net/http"
	"testing"
)

func TestMobileInitController(t *testing.T) {
	tests := map[string]struct {
		body       string
		query      string
		prepare    func(ts *controllerSuite)
		wantStatus int
	}{
		"should return 200 and the passthrough then set json content type": {
			body:  `{"cart_id":"gid://shopify/Cart/c1-a","storefront_access_token":"t"}`,
			query: "?key_id=rzp_test_x",
			prepare: func(ts *controllerSuite) {
				ts.expectMobileInitSuccess([]byte(`{"order_id":"order_1"}`))
			},
			wantStatus: http.StatusOK,
		},
		"should return 400 when the body is malformed then not call the service": {
			body:       `{`,
			query:      "?key_id=rzp_test_x",
			prepare:    func(ts *controllerSuite) {},
			wantStatus: http.StatusBadRequest,
		},
		"should return 400 when a test key is used in prod then not call the service": {
			body:       `{"cart_id":"gid://shopify/Cart/c1-a","storefront_access_token":"t"}`,
			query:      "?key_id=rzp_test_x",
			prepare:    func(ts *controllerSuite) { ts.forceProdEnv() },
			wantStatus: http.StatusBadRequest,
		},
	}

	for name, tc := range tests {
		tc := tc
		t.Run(name, func(t *testing.T) {
			ts := newControllerSuite(t)
			tc.prepare(ts)
			rec := ts.postJSON("/v1/magic/shopify/init"+tc.query, tc.body)
			if rec.Code != tc.wantStatus {
				t.Fatalf("got %d want %d body=%s", rec.Code, tc.wantStatus, rec.Body.String())
			}
		})
	}
}
```

`stubCheckoutService` already gained its `MobileInit` method and the `mobileInitResult` / `mobileInitErr` fields in Task 3 Step 3. If it did not, go back and do that first — the package will not compile without it.

Add the suite to `mobile_test.go`, following `checkout_test.go`'s existing `httptest` + `gin` pattern:

```go
type controllerSuite struct {
	t       *testing.T
	stub    *stubCheckoutService
	router  *gin.Engine
	prevEnv string
}

func newControllerSuite(t *testing.T) *controllerSuite {
	t.Helper()
	gin.SetMode(gin.TestMode)
	ts := &controllerSuite{t: t, stub: &stubCheckoutService{}, prevEnv: os.Getenv("APP_ENV")}
	t.Cleanup(func() { os.Setenv("APP_ENV", ts.prevEnv) })

	controller := NewController(ts.stub)
	ts.router = gin.New()
	ts.router.POST("/v1/magic/shopify/init", controller.MobileInit)
	return ts
}

func (ts *controllerSuite) postJSON(path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	ts.router.ServeHTTP(rec, req)
	return rec
}

func (ts *controllerSuite) expectMobileInitSuccess(passthrough []byte) {
	ts.stub.mobileInitResult = &publicdtos.CreateOrderAndGetPreferencesResponse{Response: passthrough}
}

// isTestModeAndProdEnv reads the environment, so the prod guard is only
// exercisable by setting it. Cleanup restores it.
func (ts *controllerSuite) forceProdEnv() {
	os.Setenv("APP_ENV", "prod")
}
```

If `common.GetEnv()` reads a different variable than `APP_ENV`, set that one instead — check `internal/common` before assuming.

- [ ] **Step 2: Run the test to verify it fails**

```bash
go test -tags unit ./internal/controllers/checkout/... -run TestMobileInitController -v
```
Expected: FAIL — route not registered / handler undefined.

- [ ] **Step 3: Implement the controller**

Create `internal/controllers/checkout/mobile.go`. It does transport parsing only; every semantic check lives in `MobileInitRequest.Validate`.

```go
package checkout

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	checkoutrequest "github.com/razorpay/1cc-consumer-app/internal/checkout/dtos"
	controllerutils "github.com/razorpay/1cc-consumer-app/internal/controllers/utils"
	"github.com/razorpay/1cc-consumer-app/internal/tracecodes"
	"github.com/razorpay/1cc-consumer-app/pkg/errors/errorclass"
	"github.com/razorpay/1cc-consumer-app/pkg/errors/errorcodes"
	"github.com/razorpay/1cc-consumer-app/pkg/logger"
)

// MobileInit backs POST /v1/magic/shopify/init — the single call a mobile SDK
// makes before opening the Magic modal. The response is the preferences
// passthrough, byte-identical to CreateOrderAndGetPreferences, so the client
// reads order_id and experiments from it exactly as the web plugin does.
func (c *Checkout) MobileInit(ctx *gin.Context) {
	body := checkoutrequest.MobileInitRequest{}
	if err := ctx.ShouldBindJSON(&body); err != nil {
		logger.Logger(ctx).WithError(err).Error(tracecodes.MobileInitFailed)
		ctx.AbortWithStatusJSON(http.StatusBadRequest,
			errorclass.BadRequestError.New(errorcodes.BadRequestError).Public())
		return
	}

	merchantKey := strings.TrimSpace(getMerchantKeyId(ctx))
	if isTestModeAndProdEnv(merchantKey) {
		logger.Logger(ctx).WithField("reason", "test_key_being_used").
			Error(tracecodes.MobileInitFailed)
		ctx.AbortWithStatusJSON(http.StatusBadRequest,
			errorclass.BadRequestError.New(errorcodes.BadRequestError).
				WithPublicMetadata(map[string]string{"message": "test_key_being_used"}).Public())
		return
	}
	controllerutils.SetModeInContextForTestKeys(ctx, merchantKey)

	headers := make(map[string]string)
	for name, values := range ctx.Request.Header {
		for _, value := range values {
			headers[name] = value
		}
	}
	body.Headers = headers
	body.MerchantKey = merchantKey

	res, err := c.checkoutService.MobileInit(ctx, &body)
	if err != nil {
		// ORDER IS LOAD-BEARING: check the most specific class first.
		// errorclass parents chain, and class.Is() walks up that chain — so
		// NotFoundError, whose parent is BadRequestError, is swallowed by a
		// BadRequestError check placed above it. The sibling controllers get
		// this right at checkout.go:217 and :242; match them.
		if err.Is(errorclass.NotFoundError) {
			ctx.AbortWithStatusJSON(http.StatusNotFound, err.Public())
		} else if err.Is(errorclass.UnprocessableEntityError) {
			// CreateCheckout returns this for invalid or out-of-stock Shopify
			// variants (checkout.go:437-442) — an expected shopper-facing
			// condition, not a server fault. Reporting it as 500 buries a real
			// merchant case in on-call noise.
			ctx.AbortWithStatusJSON(http.StatusUnprocessableEntity, err.Public())
		} else if err.Is(errorclass.ShopifyCredentialsNotFound) || err.Is(errorclass.AuthenticationError) {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, err.Public())
		} else if err.Is(errorclass.BadRequestError) || err.Is(errorclass.BadRequestValidationError) {
			ctx.AbortWithStatusJSON(http.StatusBadRequest, err.Public())
		} else if err.Is(errorclass.GatewayError) || err.Is(errorclass.ShopifyThrottledError) {
			ctx.AbortWithStatusJSON(http.StatusServiceUnavailable, err.Public())
		} else {
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, err.Public())
		}
		return
	}

	ctx.Data(http.StatusOK, "application/json", res.Response)
}
```

- [ ] **Step 4: Register the route**

In `internal/routing/routercx/v1/checkout.go`, add inside the existing block:

```go
		routerGroup.POST("/shopify/init", controller.MobileInit)
```

The group is mounted at `/v1/magic` (`internal/routing/routercx/router.go:42`), giving `POST /v1/magic/shopify/init` — the path `checkout.js` already calls at `initialize-shopify.ts:226`.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
go test -tags unit ./internal/controllers/checkout/... -run TestMobileInitController -v
make test-unit
```
Expected: PASS.

- [ ] **Step 6: Verify the route manually**

```bash
grep -n "shopify/init" internal/routing/routercx/v1/checkout.go
```
Expected: one match registering `controller.MobileInit`.

- [ ] **Step 7: Commit and open the PR**

```bash
git add internal/controllers/checkout/ internal/routing/routercx/v1/checkout.go
git commit -m "feat(checkout): expose POST /v1/magic/shopify/init for native Magic"
```

Before opening the PR, run the fresh-context pre-PR self-critic pass (lens G in `.agents/skills/code-review/SKILL.md`) over your own diff, and apply any `status: active` entries in `.slash/reviewer-memory/learnings.yaml` whose `path_glob` matches the files you touched.

---

# Repo B — `react-native-razorpay`

Work from `/Users/n.maneeshgupta/Documents/Codes/react-native-razorpay` on a feature branch off `master`.

## Task 5: Test infrastructure

The repo has no test tooling — no jest, no devDependencies, no tests. Everything downstream depends on this.

**Files:**
- Create: `babel.config.js`, `jest.config.js`, `__mocks__/react-native.js`, `__tests__/helpers/suite.js`, `__tests__/infra.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `makeSuite()` returning `{ RN, RazorpayCheckout, emitter, native }`; `EVENTS = { success, error, wallet }`; `npm test` runs Jest

- [ ] **Step 1: Add dev dependencies and the test script**

Edit `package.json`, keeping every existing key:

```json
  "scripts": {
    "start": "node node_modules/react-native/local-cli/cli.js start",
    "test": "jest"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@babel/preset-env": "^7.24.0",
    "@babel/preset-typescript": "^7.24.0",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0"
  }
```

Then `npm install`.

- [ ] **Step 2: Create `babel.config.js`**

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
};
```

- [ ] **Step 3: Create `jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
  },
  clearMocks: true,
};
```

- [ ] **Step 4: Create `__mocks__/react-native.js`**

We mock `react-native` wholesale rather than pulling its Jest preset — the package imports only `NativeModules` and `NativeEventEmitter`, so this keeps the toolchain small and the tests fast.

```js
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
```

- [ ] **Step 5: Create `__tests__/helpers/suite.js`**

One factory so adding a dependency later does not force edits across every test.

```js
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Each suite loads the SDK fresh. RazorpayCheckout.js builds a module-scoped
// NativeEventEmitter at import time, so without resetModules one test's
// listeners leak into the next and failures look like ordering flakes.
// resetModules also gives a fresh react-native mock, so `instances` starts
// empty and the last entry is always this suite's emitter.
function makeSuite() {
  jest.resetModules();
  const RN = require('react-native');
  const RazorpayCheckout = require(path.join(ROOT, 'RazorpayCheckout.js')).default;
  const emitter = RN.NativeEventEmitter.instances[RN.NativeEventEmitter.instances.length - 1];
  return { RN, RazorpayCheckout, emitter, native: RN.NativeModules.RNRazorpayCheckout };
}

const EVENTS = {
  success: 'Razorpay::PAYMENT_SUCCESS',
  error: 'Razorpay::PAYMENT_ERROR',
  wallet: 'Razorpay::EXTERNAL_WALLET_SELECTED',
};

module.exports = { makeSuite, EVENTS };
```

- [ ] **Step 6: Write the infrastructure test**

Create `__tests__/infra.test.js`:

```js
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
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm test -- __tests__/infra.test.js
```
Expected: PASS, 4 tests.

- [ ] **Step 8: Commit**

```bash
git add package.json babel.config.js jest.config.js __mocks__ __tests__
git commit -m "chore: add jest test infrastructure"
```

`package-lock.json` is **not** staged — this repo's `.gitignore` carries `*-lock.json`. Do not force-add it. `yarn.lock` is the tracked lock file here.

---

## Task 6: Characterisation tests for `open()`

Lock the current behaviour — quirks included — **before** Task 7 refactors it. These tests are the contract that proves `open()` is unchanged.

**Files:**
- Create: `__tests__/open.regression.test.js`

**Interfaces:**
- Consumes: `makeSuite()`, `EVENTS` (Task 5)
- Produces: nothing — this is a safety net for Task 7

- [ ] **Step 1: Write the characterisation tests**

Create `__tests__/open.regression.test.js`:

```js
const { makeSuite, EVENTS } = require('./helpers/suite');

describe('open() behaviour is frozen', () => {
  it('should call the native module then pass options through untouched', () => {
    const ts = makeSuite();
    const options = { key: 'rzp_test_1', amount: '100', nested: { a: [1, 2] } };
    ts.RazorpayCheckout.open(options);
    expect(ts.native.open).toHaveBeenCalledWith(options);
  });

  it('should resolve the promise then return the success payload', async () => {
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.open({ key: 'k' });
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await expect(promise).resolves.toEqual({ razorpay_payment_id: 'pay_1' });
  });

  it('should reject the promise then return the error payload', async () => {
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.open({ key: 'k' });
    ts.emitter.emit(EVENTS.error, { code: 0, description: 'cancelled' });
    await expect(promise).rejects.toEqual({ code: 0, description: 'cancelled' });
  });

  it('should prefer successCallback then never resolve the promise', async () => {
    const ts = makeSuite();
    const onSuccess = jest.fn();
    let settled = false;
    ts.RazorpayCheckout.open({ key: 'k' }, onSuccess).then(() => { settled = true; });
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await Promise.resolve();
    expect(onSuccess).toHaveBeenCalledWith({ razorpay_payment_id: 'pay_1' });
    expect(settled).toBe(false);
  });

  it('should prefer errorCallback then never reject the promise', async () => {
    const ts = makeSuite();
    const onError = jest.fn();
    const promise = ts.RazorpayCheckout.open({ key: 'k' }, undefined, onError);
    promise.catch(() => { throw new Error('promise must not reject'); });
    ts.emitter.emit(EVENTS.error, { code: 2 });
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith({ code: 2 });
  });

  // QUIRK, DELIBERATELY LOCKED: teardown is global, not per-call. Anything that
  // "fixes" this changes shipped behaviour for every existing integration.
  it('should remove every listener on first success then leave zero registered', () => {
    const ts = makeSuite();
    ts.RazorpayCheckout.open({ key: 'k' });
    ts.RazorpayCheckout.onExternalWalletSelection(() => {});
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    expect(ts.emitter.listenerCount(EVENTS.success)).toBe(0);
    expect(ts.emitter.listenerCount(EVENTS.error)).toBe(0);
    expect(ts.emitter.listenerCount(EVENTS.wallet)).toBe(0);
  });

  // QUIRK, DELIBERATELY LOCKED: the wallet callback also tears down the payment
  // listeners, so a wallet selection can orphan an in-flight open().
  it('should remove payment listeners on wallet selection then leave zero registered', () => {
    const ts = makeSuite();
    ts.RazorpayCheckout.open({ key: 'k' });
    ts.RazorpayCheckout.onExternalWalletSelection(() => {});
    ts.emitter.emit(EVENTS.wallet, { external_wallet: 'paytm' });
    expect(ts.emitter.listenerCount(EVENTS.success)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass against current code**

```bash
npm test -- __tests__/open.regression.test.js
```
Expected: PASS, 7 tests. They must pass **before** any refactor — that is what makes them characterisation tests. If any fails, the assertion is wrong about today's behaviour; fix the test, not `RazorpayCheckout.js`.

- [ ] **Step 3: Commit**

```bash
git add __tests__/open.regression.test.js
git commit -m "test: characterise open() behaviour before refactor"
```

---

## Task 7: Extract the checkout session helper

`open()` tears down listeners on first success (`RazorpayCheckout.js:45`) using `removeAllListeners`, so nothing can run after it. Phase 3 needs a session that survives success. Extract the wiring; leave `open()`'s behaviour identical.

**HUMAN CHECKPOINT.** Stop after this task and get a review before continuing. This is the only task that touches shipped behaviour.

**Files:**
- Create: `src/internal/checkoutSession.js`
- Modify: `RazorpayCheckout.js`

**Interfaces:**
- Consumes: `NativeModules`, `NativeEventEmitter` from `react-native`
- Produces:
  - `EVENT_NAMES = { SUCCESS, ERROR, EXTERNAL_WALLET }`
  - `getEmitter()` → the shared `NativeEventEmitter`
  - `removeSubscriptions()` → void
  - `getNativeModule()` → the resolved native module
  - `runCheckout(options, { onSuccess, onError, teardown })` → void

- [ ] **Step 1: Create the helper**

Create `src/internal/checkoutSession.js`. Move the architecture detection here verbatim from `RazorpayCheckout.js:5-31`.

```js
'use strict';

import { NativeModules, NativeEventEmitter } from 'react-native';

// Runtime detection for new architecture.
// RN <0.74 uses __turboModuleProxy; RN >=0.74 (bridgeless) exposes TurboModuleRegistry and nativeFabricUIManager instead.
const isTurboModuleEnabled =
  global.__turboModuleProxy != null ||
  global.TurboModuleRegistry != null ||
  global.nativeFabricUIManager != null;

let RazorpayCheckoutModule;
let RazorpayEventEmitterModule;

if (isTurboModuleEnabled) {
  try {
    RazorpayCheckoutModule = require('../NativeRazorpayCheckout').default;
    RazorpayEventEmitterModule = require('../NativeRazorpayEventEmitter').default;
  } catch (error) {
    RazorpayCheckoutModule = NativeModules.RNRazorpayCheckout;
    RazorpayEventEmitterModule = NativeModules.RazorpayEventEmitter;
  }
} else {
  RazorpayCheckoutModule = NativeModules.RNRazorpayCheckout;
  RazorpayEventEmitterModule = NativeModules.RazorpayEventEmitter;
}

const razorpayEvents = new NativeEventEmitter(RazorpayEventEmitterModule);

export const EVENT_NAMES = {
  SUCCESS: 'Razorpay::PAYMENT_SUCCESS',
  ERROR: 'Razorpay::PAYMENT_ERROR',
  EXTERNAL_WALLET: 'Razorpay::EXTERNAL_WALLET_SELECTED',
};

export function getEmitter() {
  return razorpayEvents;
}

export function getNativeModule() {
  return RazorpayCheckoutModule;
}

export function removeSubscriptions() {
  razorpayEvents.removeAllListeners(EVENT_NAMES.SUCCESS);
  razorpayEvents.removeAllListeners(EVENT_NAMES.ERROR);
  razorpayEvents.removeAllListeners(EVENT_NAMES.EXTERNAL_WALLET);
}

// Wires the two payment listeners and launches the native checkout.
//
// `teardown` is a parameter rather than a hardcoded removeSubscriptions()
// because Magic must keep listening past the first success: it still has a
// Shopify order to place. open() passes the original teardown and so keeps
// its shipped behaviour exactly.
export function runCheckout(options, { onSuccess, onError, teardown }) {
  razorpayEvents.addListener(EVENT_NAMES.SUCCESS, (data) => {
    onSuccess(data);
    teardown();
  });
  razorpayEvents.addListener(EVENT_NAMES.ERROR, (data) => {
    onError(data);
    teardown();
  });
  RazorpayCheckoutModule.open(options);
}
```

- [ ] **Step 2: Rewrite `RazorpayCheckout.js` to delegate**

Replace the whole file:

```js
'use strict';

import {
  EVENT_NAMES,
  getEmitter,
  removeSubscriptions,
  runCheckout,
} from './src/internal/checkoutSession';

class RazorpayCheckout {
  static open(options, successCallback, errorCallback) {
    return new Promise(function (resolve, reject) {
      runCheckout(options, {
        onSuccess: (data) => (successCallback || resolve)(data),
        onError: (data) => (errorCallback || reject)(data),
        teardown: removeSubscriptions,
      });
    });
  }

  static onExternalWalletSelection(externalWalletCallback) {
    getEmitter().addListener(EVENT_NAMES.EXTERNAL_WALLET, (data) => {
      externalWalletCallback(data);
      removeSubscriptions();
    });
  }
}

export default RazorpayCheckout;
```

- [ ] **Step 3: Run the characterisation tests**

```bash
npm test
```
Expected: PASS, all 11 tests, **with no test edits.** If any Task 6 test fails, the refactor changed behaviour — revert and retry. Do not adjust the test to match.

- [ ] **Step 4: Commit**

```bash
git add RazorpayCheckout.js src/internal/checkoutSession.js
git commit -m "refactor: extract checkout session wiring, open() behaviour unchanged"
```

- [ ] **Step 5: STOP — human review**

Post the diff and the green test run. Do not start Task 8 until a human approves.

---

## Task 8: Error taxonomy

**Files:**
- Create: `src/magic/core/errors.js`
- Test: `src/magic/core/__tests__/errors.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `MAGIC_ERROR_CODES = { ORDER_CREATE_FAILED, CHECKOUT_CANCELLED, PAYMENT_FAILED, COMPLETE_FAILED, INVALID_OPTIONS }`
  - `class MagicCheckoutError extends Error` with `{ code, reason, details }`

- [ ] **Step 1: Write the failing test**

Create `src/magic/core/__tests__/errors.test.js`:

```js
const { MagicCheckoutError, MAGIC_ERROR_CODES } = require('../errors');

describe('MagicCheckoutError', () => {
  it('should build an error then expose code reason and details', () => {
    const err = new MagicCheckoutError(MAGIC_ERROR_CODES.ORDER_CREATE_FAILED, 'network', {
      status: 0,
    });
    expect(err.code).toBe('MAGIC_ORDER_CREATE_FAILED');
    expect(err.reason).toBe('network');
    expect(err.details).toEqual({ status: 0 });
  });

  it('should extend Error then remain instanceof Error', () => {
    const err = new MagicCheckoutError(MAGIC_ERROR_CODES.PAYMENT_FAILED, 'user_cancelled');
    expect(err instanceof Error).toBe(true);
    expect(err.name).toBe('MagicCheckoutError');
  });

  it('should default details then return an empty object', () => {
    expect(new MagicCheckoutError(MAGIC_ERROR_CODES.INVALID_OPTIONS, 'missing_key').details).toEqual({});
  });

  it('should expose every documented code then match the taxonomy', () => {
    expect(MAGIC_ERROR_CODES).toEqual({
      ORDER_CREATE_FAILED: 'MAGIC_ORDER_CREATE_FAILED',
      CHECKOUT_CANCELLED: 'MAGIC_CHECKOUT_CANCELLED',
      PAYMENT_FAILED: 'MAGIC_PAYMENT_FAILED',
      COMPLETE_FAILED: 'MAGIC_COMPLETE_FAILED',
      INVALID_OPTIONS: 'MAGIC_INVALID_OPTIONS',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- src/magic/core/__tests__/errors.test.js
```
Expected: FAIL — cannot find module `../errors`.

- [ ] **Step 3: Implement**

Create `src/magic/core/errors.js`:

```js
'use strict';

// ACTION_STATUS names. The specific cause goes in `reason`, never in the code,
// so one Coralogix query over MAGIC_* yields success-vs-failure counts split by
// reason instead of exploding into a code per failure mode.
export const MAGIC_ERROR_CODES = {
  ORDER_CREATE_FAILED: 'MAGIC_ORDER_CREATE_FAILED',
  CHECKOUT_CANCELLED: 'MAGIC_CHECKOUT_CANCELLED',
  PAYMENT_FAILED: 'MAGIC_PAYMENT_FAILED',
  COMPLETE_FAILED: 'MAGIC_COMPLETE_FAILED',
  INVALID_OPTIONS: 'MAGIC_INVALID_OPTIONS',
};

export class MagicCheckoutError extends Error {
  constructor(code, reason, details) {
    super(`${code}: ${reason}`);
    this.name = 'MagicCheckoutError';
    this.code = code;
    this.reason = reason;
    this.details = details || {};
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- src/magic/core/__tests__/errors.test.js
```
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/magic/core/errors.js src/magic/core/__tests__/errors.test.js
git commit -m "feat(magic): add error taxonomy"
```

---

## Task 9: Endpoints and the core purity guard

The complete-route choice mirrors `magic-plugins` exactly (`post-checkout.ts:162-166`): branch on an experiment the **server** handed us, never on a hardcoded constant. That is what keeps the choice tunable without an app-store release.

**Files:**
- Create: `src/magic/core/endpoints.js`
- Test: `src/magic/core/__tests__/endpoints.test.js`
- Test: `src/magic/core/__tests__/purity.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `BASE_URL = 'https://api.razorpay.com/v1'`
  - `initUrl(key)` → string
  - `completeUrl(key, experiments)` → string
  - `POLL_BUDGET_MS`, `BACKOFF_INITIAL_MS`, `BACKOFF_CAP_MS`

- [ ] **Step 1: Write the failing tests**

Create `src/magic/core/__tests__/endpoints.test.js`:

```js
const { initUrl, completeUrl, BASE_URL } = require('../endpoints');

describe('endpoints', () => {
  it('should build the init url then include the encoded key', () => {
    expect(initUrl('rzp_test_a b')).toBe(`${BASE_URL}/magic/shopify/init?key_id=rzp_test_a%20b`);
  });

  const completeCases = {
    'should use the monolith route then return 1cc path when the experiment is absent': [
      undefined,
      `${BASE_URL}/1cc/shopify/complete?key_id=k`,
    ],
    'should use the monolith route then return 1cc path when the variant is off': [
      { shopify_pre_payment_guardrail: 'variant_off' },
      `${BASE_URL}/1cc/shopify/complete?key_id=k`,
    ],
    'should use the MCS route then return checkouts path when the variant is on': [
      { shopify_pre_payment_guardrail: 'variant_on' },
      `${BASE_URL}/checkouts/shopify/complete?key_id=k`,
    ],
  };

  Object.entries(completeCases).forEach(([name, [experiments, expected]]) => {
    it(name, () => expect(completeUrl('k', experiments)).toBe(expected));
  });
});
```

Create `src/magic/core/__tests__/purity.test.js`. This enforces the constraint that makes a Flutter or Capacitor adapter possible later — the core must never reach the bridge directly.

```js
const fs = require('fs');
const path = require('path');

const CORE = path.resolve(__dirname, '..');

function coreSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return coreSourceFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

describe('core purity', () => {
  it('should keep the core platform-neutral then import no react-native', () => {
    const offenders = coreSourceFiles(CORE).filter((file) =>
      /from\s+['"]react-native['"]|require\(['"]react-native['"]\)/.test(
        fs.readFileSync(file, 'utf8')
      )
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/magic/core/__tests__/endpoints.test.js
```
Expected: FAIL — cannot find module `../endpoints`.

- [ ] **Step 3: Implement**

Create `src/magic/core/endpoints.js`:

```js
'use strict';

export const BASE_URL = 'https://api.razorpay.com/v1';

// The SDK's own waiting budget for phase 3 — not a money timeout. Exhausting it
// does NOT mean the order failed: MCS's worker keeps retrying for ~15 minutes
// after it has the request. Kept short deliberately so the native SDK is never
// left waiting on the WebView completion callback.
export const POLL_BUDGET_MS = 8000;
export const BACKOFF_INITIAL_MS = 500;
export const BACKOFF_CAP_MS = 2000;

const PRE_PAYMENT_GUARDRAIL = 'shopify_pre_payment_guardrail';

export function initUrl(key) {
  return `${BASE_URL}/magic/shopify/init?key_id=${encodeURIComponent(key)}`;
}

// Mirrors magic-plugins post-checkout.ts:162-166. The experiment value arrives
// in the phase-1 response, so which endpoint a shipped binary calls stays
// server-tunable — a merchant moved into the variant cohort does not need an
// app update to keep placing orders.
export function completeUrl(key, experiments) {
  const path =
    experiments && experiments[PRE_PAYMENT_GUARDRAIL] === 'variant_on'
      ? 'checkouts/shopify/complete'
      : '1cc/shopify/complete';
  return `${BASE_URL}/${path}?key_id=${encodeURIComponent(key)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/magic/core/__tests__/
```
Expected: PASS — 4 endpoint tests and 1 purity test.

- [ ] **Step 5: Commit**

```bash
git add src/magic/core/endpoints.js src/magic/core/__tests__/
git commit -m "feat(magic): add endpoint resolution and core purity guard"
```

---

## Task 10: HTTP client

Two calls, and the classification of phase-3 outcomes. "Pending" is a **success** path, exactly as it is on web: once MCS has the request, placement is owned by its mutex, 24h marker and SQS worker.

**Files:**
- Create: `src/magic/core/client.js`
- Test: `src/magic/core/__tests__/client.test.js`

**Interfaces:**
- Consumes: `initUrl`, `completeUrl`, `POLL_BUDGET_MS`, `BACKOFF_INITIAL_MS`, `BACKOFF_CAP_MS` (Task 9); `MagicCheckoutError`, `MAGIC_ERROR_CODES` (Task 8)
- Produces:
  - `createClient(http)` → `{ init(key, body), complete(key, experiments, handle, now) }`
  - `init` resolves `{ order_id, experiments }`
  - `complete` resolves `{ status: 'placed'|'pending', data }`

- [ ] **Step 1: Write the failing tests**

Create `src/magic/core/__tests__/client.test.js`:

```js
const { createClient } = require('../client');
const { MAGIC_ERROR_CODES } = require('../errors');

function makeHttp(responses) {
  const calls = [];
  const queue = responses.slice();
  return {
    calls,
    post: jest.fn((url, body) => {
      calls.push({ url, body });
      const next = queue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next);
    }),
  };
}

describe('init', () => {
  it('should post the cart id and token then return order id and experiments', async () => {
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1', experiments: { a: 'b' } } },
    ]);
    const res = await createClient(http).init('k', {
      cart_id: 'gid://shopify/Cart/c1-a',
      storefront_access_token: 't',
    });
    expect(res).toEqual({ order_id: 'order_1', experiments: { a: 'b' } });
    expect(http.calls[0].url).toContain('/magic/shopify/init?key_id=k');
    expect(http.calls[0].body).toEqual({
      cart_id: 'gid://shopify/Cart/c1-a',
      storefront_access_token: 't',
    });
  });

  it('should reject with ORDER_CREATE_FAILED then set reason http_400 on a 4xx', async () => {
    const http = makeHttp([{ status: 400, data: { error: 'bad' } }]);
    await expect(createClient(http).init('k', {})).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
      reason: 'http_400',
    });
  });

  it('should reject with ORDER_CREATE_FAILED then set reason network on a transport error', async () => {
    const http = makeHttp([new Error('offline')]);
    await expect(createClient(http).init('k', {})).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
      reason: 'network',
    });
  });

  it('should reject with ORDER_CREATE_FAILED then set reason missing_order_id when absent', async () => {
    const http = makeHttp([{ status: 200, data: { experiments: {} } }]);
    await expect(createClient(http).init('k', {})).rejects.toMatchObject({
      reason: 'missing_order_id',
    });
  });
});

describe('complete', () => {
  const handle = {
    razorpay_order_id: 'order_1',
    razorpay_payment_id: 'pay_1',
    razorpay_signature: 'sig',
    key: 'k',
  };

  it('should post the handle then return placed on 200', async () => {
    const http = makeHttp([{ status: 200, data: { order_id: 'shop_1' } }]);
    const res = await createClient(http).complete('k', undefined, handle, () => 0);
    expect(res.status).toBe('placed');
    expect(http.calls[0].body).toEqual(handle);
  });

  it('should treat a 422 already placed then return pending', async () => {
    const http = makeHttp([{ status: 422, data: { error: { code: 'ALREADY_PLACED' } } }]);
    const res = await createClient(http).complete('k', undefined, handle, () => 0);
    expect(res.status).toBe('pending');
  });

  it('should retry a 5xx then return placed when the retry succeeds', async () => {
    const http = makeHttp([
      { status: 500, data: {} },
      { status: 200, data: { order_id: 'shop_1' } },
    ]);
    let clock = 0;
    const res = await createClient(http).complete('k', undefined, handle, () => (clock += 100));
    expect(res.status).toBe('placed');
    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('should exhaust the budget then return pending without throwing', async () => {
    const http = makeHttp([
      { status: 500, data: {} },
      { status: 500, data: {} },
      { status: 500, data: {} },
    ]);
    let clock = 0;
    const res = await createClient(http).complete('k', undefined, handle, () => (clock += 5000));
    expect(res.status).toBe('pending');
  });

  it('should reject with COMPLETE_FAILED then set reason http_400 on a non-retryable 4xx', async () => {
    const http = makeHttp([{ status: 400, data: { error: { code: 'BAD_SIGNATURE' } } }]);
    await expect(
      createClient(http).complete('k', undefined, handle, () => 0)
    ).rejects.toMatchObject({ code: MAGIC_ERROR_CODES.COMPLETE_FAILED, reason: 'http_400' });
  });

  it('should use the variant route then post to checkouts shopify complete', async () => {
    const http = makeHttp([{ status: 200, data: {} }]);
    await createClient(http).complete(
      'k',
      { shopify_pre_payment_guardrail: 'variant_on' },
      handle,
      () => 0
    );
    expect(http.calls[0].url).toContain('/checkouts/shopify/complete');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/magic/core/__tests__/client.test.js
```
Expected: FAIL — cannot find module `../client`.

- [ ] **Step 3: Implement**

Create `src/magic/core/client.js`:

```js
'use strict';

import {
  initUrl,
  completeUrl,
  POLL_BUDGET_MS,
  BACKOFF_INITIAL_MS,
  BACKOFF_CAP_MS,
} from './endpoints';
import { MagicCheckoutError, MAGIC_ERROR_CODES } from './errors';

// MCS signals "I have the request, my worker owns placement from here" through
// these. They are NOT failures: retrying past them buys nothing, and surfacing
// them as errors would tell a shopper their order failed when it has not.
const PENDING_CODES = ['DELEGATED_TO_SQS', 'ALREADY_PLACED', 'RETRY_FAILED'];

function errorCodeOf(data) {
  if (!data) return undefined;
  if (data.error && typeof data.error.code === 'string') return data.error.code;
  return typeof data.code === 'string' ? data.code : undefined;
}

function backoffFor(attempt) {
  return Math.min(BACKOFF_INITIAL_MS * Math.pow(2, attempt), BACKOFF_CAP_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createClient(http) {
  async function init(key, body) {
    let res;
    try {
      res = await http.post(initUrl(key), body);
    } catch (e) {
      throw new MagicCheckoutError(MAGIC_ERROR_CODES.ORDER_CREATE_FAILED, 'network', {
        message: e && e.message,
      });
    }
    if (res.status !== 200) {
      throw new MagicCheckoutError(
        MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
        `http_${res.status}`,
        { status: res.status }
      );
    }
    const data = res.data || {};
    if (!data.order_id) {
      throw new MagicCheckoutError(
        MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
        'missing_order_id',
        {}
      );
    }
    return { order_id: data.order_id, experiments: data.experiments };
  }

  // Confirms MCS RECEIVED the request; it does not wait for the Shopify order.
  // Once MCS has it, the mutex, the 24h placed-marker and the SQS worker own
  // the outcome, so the client waiting longer changes nothing a shopper sees.
  async function complete(key, experiments, handle, now) {
    const url = completeUrl(key, experiments);
    const started = now();
    let attempt = 0;

    for (;;) {
      let res;
      let transportError = null;
      try {
        res = await http.post(url, handle);
      } catch (e) {
        transportError = e;
      }

      if (!transportError) {
        if (res.status === 200) {
          return { status: 'placed', data: res.data || {} };
        }
        if (PENDING_CODES.indexOf(errorCodeOf(res.data)) !== -1) {
          return { status: 'pending', data: res.data || {} };
        }
        if (res.status < 500) {
          throw new MagicCheckoutError(
            MAGIC_ERROR_CODES.COMPLETE_FAILED,
            `http_${res.status}`,
            { status: res.status, handle }
          );
        }
      }

      // 5xx or transport failure: retry is safe because MCS is idempotent
      // (mutex + 24h marker + Shopify search fallback).
      if (now() - started >= POLL_BUDGET_MS) {
        return { status: 'pending', data: {} };
      }
      await sleep(backoffFor(attempt));
      attempt += 1;
    }
  }

  return { init, complete };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/magic/core/__tests__/client.test.js
```
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/magic/core/client.js src/magic/core/__tests__/client.test.js
git commit -m "feat(magic): add init and complete HTTP client"
```

---

## Task 11: Orchestrator

**Files:**
- Create: `src/magic/core/openMagicCheckout.js`, `src/magic/core/index.js`
- Test: `src/magic/core/__tests__/openMagicCheckout.test.js`

**Interfaces:**
- Consumes: `createClient` (Task 10); `MagicCheckoutError`, `MAGIC_ERROR_CODES` (Task 8)
- Produces: `createMagicCheckout({ host, http, now })` → `{ openMagicCheckout(options) }`
  - `host.open(options)` → void
  - `host.subscribe({ onSuccess, onError })` → `unsubscribe()`
  - `openMagicCheckout({ key, storefront_access_token, cart_id })` → `Promise<{ order_id, order_status_url, payment_id, status }>`

- [ ] **Step 1: Write the failing tests**

Create `src/magic/core/__tests__/openMagicCheckout.test.js`:

```js
const { createMagicCheckout } = require('../index');
const { MAGIC_ERROR_CODES } = require('../errors');

function makeHost() {
  const host = {
    opened: [],
    handlers: null,
    unsubscribed: false,
    open: jest.fn((options) => host.opened.push(options)),
    subscribe: jest.fn((handlers) => {
      host.handlers = handlers;
      return () => { host.unsubscribed = true; };
    }),
  };
  return host;
}

function makeHttp(responses) {
  const queue = responses.slice();
  const calls = [];
  return {
    calls,
    post: jest.fn((url, body) => {
      calls.push({ url, body });
      const next = queue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next);
    }),
  };
}

const OPTIONS = {
  key: 'rzp_test_k',
  storefront_access_token: 'sf-token',
  cart_id: 'gid://shopify/Cart/c1-abc',
};

const SUCCESS = {
  razorpay_payment_id: 'pay_1',
  razorpay_order_id: 'order_1',
  razorpay_signature: 'sig_1',
};

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('openMagicCheckout', () => {
  it('should complete every phase then resolve with the shopify order', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1', experiments: {} } },
      { status: 200, data: { order_id: 'shop_1', order_status_url: 'https://s/o/1' } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();

    expect(host.opened[0]).toEqual({
      key: 'rzp_test_k',
      order_id: 'order_1',
      one_click_checkout: true,
    });

    host.handlers.onSuccess(SUCCESS);
    await expect(promise).resolves.toMatchObject({
      order_id: 'shop_1',
      order_status_url: 'https://s/o/1',
      payment_id: 'pay_1',
      status: 'placed',
    });
  });

  it('should never send cart data to the modal then pass only key and order id', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 200, data: {} },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });
    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);
    await promise;

    expect(Object.keys(host.opened[0]).sort()).toEqual([
      'key',
      'one_click_checkout',
      'order_id',
    ]);
  });

  it('should not call complete when the user dismisses then reject as cancelled', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onError({ code: 0, description: 'cancelled' });

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.CHECKOUT_CANCELLED,
    });
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('should reject as payment failed then pass the native code through', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 200, data: { order_id: 'order_1' } }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onError({ code: 2, description: 'network' });

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.PAYMENT_FAILED,
      details: { code: 2, description: 'network' },
    });
  });

  it('should reject before opening the modal then never call host open on phase one failure', async () => {
    const host = makeHost();
    const http = makeHttp([{ status: 500, data: {} }]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    await expect(sdk.openMagicCheckout(OPTIONS)).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.ORDER_CREATE_FAILED,
    });
    expect(host.open).not.toHaveBeenCalled();
  });

  it('should resolve as pending then report status pending when MCS defers', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 422, data: { error: { code: 'DELEGATED_TO_SQS' } } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).resolves.toMatchObject({ status: 'pending', payment_id: 'pay_1' });
  });

  it('should attach the handle then include it on every phase three rejection', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 400, data: { error: { code: 'BAD_SIGNATURE' } } },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);

    await expect(promise).rejects.toMatchObject({
      code: MAGIC_ERROR_CODES.COMPLETE_FAILED,
      details: {
        handle: {
          razorpay_order_id: 'order_1',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'sig_1',
          key: 'rzp_test_k',
        },
      },
    });
  });

  it('should unsubscribe then release the listener on every terminal path', async () => {
    const host = makeHost();
    const http = makeHttp([
      { status: 200, data: { order_id: 'order_1' } },
      { status: 200, data: {} },
    ]);
    const sdk = createMagicCheckout({ host, http, now: () => 0 });

    const promise = sdk.openMagicCheckout(OPTIONS);
    await flush();
    host.handlers.onSuccess(SUCCESS);
    await promise;

    expect(host.unsubscribed).toBe(true);
  });

  const invalid = {
    'should reject when key is missing then report missing_key': [
      { storefront_access_token: 't', cart_id: 'c' },
      'missing_key',
    ],
    'should reject when cart_id is missing then report missing_cart_id': [
      { key: 'k', storefront_access_token: 't' },
      'missing_cart_id',
    ],
    'should reject when the storefront token is missing then report missing_storefront_access_token': [
      { key: 'k', cart_id: 'c' },
      'missing_storefront_access_token',
    ],
    'should reject a cart object then report cart_not_allowed': [
      { key: 'k', cart_id: 'c', storefront_access_token: 't', shopify_cart: { items: [] } },
      'cart_not_allowed',
    ],
  };

  Object.entries(invalid).forEach(([name, [options, reason]]) => {
    it(name, async () => {
      const host = makeHost();
      const http = makeHttp([]);
      const sdk = createMagicCheckout({ host, http, now: () => 0 });
      await expect(sdk.openMagicCheckout(options)).rejects.toMatchObject({
        code: MAGIC_ERROR_CODES.INVALID_OPTIONS,
        reason,
      });
      expect(http.post).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/magic/core/__tests__/openMagicCheckout.test.js
```
Expected: FAIL — cannot find module `../index`.

- [ ] **Step 3: Implement the orchestrator**

Create `src/magic/core/openMagicCheckout.js`:

```js
'use strict';

import { MagicCheckoutError, MAGIC_ERROR_CODES } from './errors';

const NATIVE_PAYMENT_CANCELED = 0;

// A cart object must never reach us. Prices and line items belong server-side,
// and accepting one here would put them in a publicly-readable package and on
// the wire from a device we do not control.
function validate(options) {
  const o = options || {};
  if (!o.key) return 'missing_key';
  if (!o.cart_id) return 'missing_cart_id';
  if (!o.storefront_access_token) return 'missing_storefront_access_token';
  if (o.shopify_cart || o.cart || o.line_items) return 'cart_not_allowed';
  return null;
}

export function makeOpenMagicCheckout({ host, client }) {
  return function openMagicCheckout(options) {
    const invalidReason = validate(options);
    if (invalidReason) {
      return Promise.reject(
        new MagicCheckoutError(MAGIC_ERROR_CODES.INVALID_OPTIONS, invalidReason, {})
      );
    }

    const { key, cart_id, storefront_access_token } = options;

    return client
      .init(key, { cart_id, storefront_access_token })
      .then(({ order_id, experiments }) => {
        return new Promise((resolve, reject) => {
          let unsubscribe = null;
          const release = () => {
            if (unsubscribe) unsubscribe();
            unsubscribe = null;
          };

          unsubscribe = host.subscribe({
            onSuccess: (data) => {
              // The handle is assembled BEFORE phase 3 so it can be attached to
              // any failure. Without it a caller cannot retry a completion, and
              // a captured payment has no route to an order.
              const handle = {
                razorpay_order_id: data.razorpay_order_id || order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                key,
              };
              client
                .complete(key, experiments, handle)
                .then((result) => {
                  release();
                  resolve({
                    order_id: result.data.order_id,
                    order_status_url: result.data.order_status_url,
                    total_amount: result.data.total_amount,
                    payment_id: handle.razorpay_payment_id,
                    status: result.status,
                  });
                })
                .catch((err) => {
                  release();
                  err.details = Object.assign({}, err.details, { handle });
                  reject(err);
                });
            },
            onError: (data) => {
              release();
              const cancelled = data && data.code === NATIVE_PAYMENT_CANCELED;
              reject(
                new MagicCheckoutError(
                  cancelled
                    ? MAGIC_ERROR_CODES.CHECKOUT_CANCELLED
                    : MAGIC_ERROR_CODES.PAYMENT_FAILED,
                  cancelled ? 'user_cancelled' : 'gateway_error',
                  data
                )
              );
            },
          });

          // Exactly the option set a standard integration passes today.
          // isMagic() activates from the order's line_items_total plus the
          // merchant's server-side 1CC feature, so no cart option is needed.
          host.open({ key, order_id, one_click_checkout: true });
        });
      });
  };
}
```

- [ ] **Step 4: Implement the factory**

Create `src/magic/core/index.js`:

```js
'use strict';

import { createClient } from './client';
import { makeOpenMagicCheckout } from './openMagicCheckout';

// `now` is injected so the phase-3 budget is testable with a fake clock rather
// than by sleeping in tests.
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
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm test -- src/magic/core/__tests__/
```
Expected: PASS — all core suites including the purity guard.

- [ ] **Step 6: Commit**

```bash
git add src/magic/core/openMagicCheckout.js src/magic/core/index.js src/magic/core/__tests__/openMagicCheckout.test.js
git commit -m "feat(magic): add three-phase orchestrator"
```

---

## Task 12: React Native adapter and public API

**Files:**
- Create: `src/magic/adapters/reactNative.js`
- Modify: `RazorpayCheckout.js`, `src/types.ts`
- Test: `__tests__/magic.integration.test.js`

**Interfaces:**
- Consumes: `createMagicCheckout` (Task 11); `EVENT_NAMES`, `getEmitter`, `getNativeModule`, `removeSubscriptions` (Task 7)
- Produces: `RazorpayCheckout.openMagicCheckout(options)` → `Promise<MagicCheckoutResult>`

- [ ] **Step 1: Write the failing integration test**

Create `__tests__/magic.integration.test.js`:

```js
const { makeSuite, EVENTS } = require('./helpers/suite');

describe('openMagicCheckout through the RN adapter', () => {
  const OPTIONS = {
    key: 'rzp_test_k',
    storefront_access_token: 'sf-token',
    cart_id: 'gid://shopify/Cart/c1-abc',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  function respond(bodies) {
    const queue = bodies.slice();
    global.fetch.mockImplementation(() => {
      const next = queue.shift();
      return Promise.resolve({
        status: next.status,
        json: () => Promise.resolve(next.body),
      });
    });
  }

  it('should open the native modal then resolve after completion', async () => {
    respond([
      { status: 200, body: { order_id: 'order_1', experiments: {} } },
      { status: 200, body: { order_id: 'shop_1', order_status_url: 'https://s/o/1' } },
    ]);
    const ts = makeSuite();

    const promise = ts.RazorpayCheckout.openMagicCheckout(OPTIONS);
    await new Promise((r) => setImmediate(r));

    expect(ts.native.open).toHaveBeenCalledWith({
      key: 'rzp_test_k',
      order_id: 'order_1',
      one_click_checkout: true,
    });

    ts.emitter.emit(EVENTS.success, {
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_1',
      razorpay_signature: 'sig_1',
    });

    await expect(promise).resolves.toMatchObject({ order_id: 'shop_1', status: 'placed' });
  });

  it('should leave open() untouched then keep its listeners working', async () => {
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.open({ key: 'k' });
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_2' });
    await expect(promise).resolves.toEqual({ razorpay_payment_id: 'pay_2' });
  });

  it('should release its listener then leave none registered after Magic resolves', async () => {
    respond([
      { status: 200, body: { order_id: 'order_1' } },
      { status: 200, body: {} },
    ]);
    const ts = makeSuite();
    const promise = ts.RazorpayCheckout.openMagicCheckout(OPTIONS);
    await new Promise((r) => setImmediate(r));
    ts.emitter.emit(EVENTS.success, { razorpay_payment_id: 'pay_1' });
    await promise;
    expect(ts.emitter.listenerCount(EVENTS.success)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- __tests__/magic.integration.test.js
```
Expected: FAIL — `ts.RazorpayCheckout.openMagicCheckout is not a function`.

- [ ] **Step 3: Implement the adapter**

Create `src/magic/adapters/reactNative.js`. This is the only file in the Magic feature that knows a native bridge exists.

```js
'use strict';

import {
  EVENT_NAMES,
  getEmitter,
  getNativeModule,
} from '../../internal/checkoutSession';

// Magic subscribes with per-call handles rather than reusing
// removeSubscriptions(), because that helper clears listeners globally and
// would tear down a concurrent open() as a side effect.
export function createReactNativeHost() {
  return {
    open(options) {
      getNativeModule().open(options);
    },
    subscribe({ onSuccess, onError }) {
      const emitter = getEmitter();
      const successSub = emitter.addListener(EVENT_NAMES.SUCCESS, onSuccess);
      const errorSub = emitter.addListener(EVENT_NAMES.ERROR, onError);
      return () => {
        successSub.remove();
        errorSub.remove();
      };
    },
  };
}

// React Native ships fetch, so this adds no dependency. It exists as a port so
// the core can be tested without a network and reused by a non-RN wrapper.
export function createFetchHttp() {
  return {
    post(url, body) {
      return fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((res) =>
        res
          .json()
          .catch(() => ({}))
          .then((data) => ({ status: res.status, data }))
      );
    },
  };
}
```

- [ ] **Step 4: Wire the public API**

Modify `RazorpayCheckout.js` — add the imports and the static method, leaving `open` and `onExternalWalletSelection` exactly as Task 7 left them:

```js
import { createMagicCheckout } from './src/magic/core';
import {
  createReactNativeHost,
  createFetchHttp,
} from './src/magic/adapters/reactNative';

let magic;
function getMagic() {
  if (!magic) {
    magic = createMagicCheckout({
      host: createReactNativeHost(),
      http: createFetchHttp(),
    });
  }
  return magic;
}
```

and inside the class, after `open`:

```js
  static openMagicCheckout(options) {
    return getMagic().openMagicCheckout(options);
  }
```

- [ ] **Step 5: Add the types**

Append to `src/types.ts`. Do not narrow the existing `[key: string]: any` on `RazorpayOptions`.

```ts
export type MagicCheckoutOptions = {
  /** Razorpay public key_id. Authenticates the init call and identifies the merchant. */
  key: string;
  /** The app's Shopify Storefront access token. Only the app that created a cart can read it. */
  storefront_access_token: string;
  /** Storefront cart id, e.g. "gid://shopify/Cart/c1-abc". An identifier — never a cart object. */
  cart_id: string;
};

export type MagicCheckoutResult = {
  /** Shopify order id. Undefined while status is 'pending'. */
  order_id?: string;
  order_status_url?: string;
  total_amount?: number;
  payment_id: string;
  /** 'placed' — Shopify order exists. 'pending' — accepted, being placed asynchronously. */
  status: 'placed' | 'pending';
};

export type MagicHandle = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  key: string;
};
```

- [ ] **Step 6: Run the whole suite**

```bash
npm test
```
Expected: PASS — every suite, including the Task 6 characterisation tests unchanged.

- [ ] **Step 7: Commit**

```bash
git add RazorpayCheckout.js src/magic/adapters src/types.ts __tests__/magic.integration.test.js
git commit -m "feat(magic): expose openMagicCheckout via the React Native adapter"
```

---

## Task 13: Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the Magic Checkout section**

Append to `README.md`:

````markdown
## Magic Checkout (Shopify)

Magic Checkout (1CC) for Shopify merchants shipping a React Native app. Requires the
merchant to be 1CC-enabled server-side; no SDK flag turns it on.

```js
import RazorpayCheckout from 'react-native-razorpay';

try {
  const result = await RazorpayCheckout.openMagicCheckout({
    key: 'rzp_live_xxxxxxxx',
    storefront_access_token: '<your Shopify Storefront access token>',
    cart_id: 'gid://shopify/Cart/c1-abcdef',
  });

  if (result.status === 'placed') {
    // Shopify order exists. result.order_status_url is safe to show.
  } else {
    // 'pending' — payment captured and accepted; Razorpay is placing the order.
    // Show "we're confirming your order", never "failed".
  }
} catch (error) {
  // error.code is one of MAGIC_ORDER_CREATE_FAILED, MAGIC_CHECKOUT_CANCELLED,
  // MAGIC_PAYMENT_FAILED, MAGIC_COMPLETE_FAILED, MAGIC_INVALID_OPTIONS.
  // error.reason carries the specific cause.
}
```

### Parameters

| Parameter | Required | Notes |
|---|---|---|
| `key` | yes | Razorpay public `key_id`. Already shipped in your app today |
| `storefront_access_token` | yes | Your Shopify Storefront access token. A cart is only readable by the Storefront app that created it, which is why this is yours and not Razorpay's |
| `cart_id` | yes | Storefront cart **id**, not a cart object. Passing a cart is rejected — prices stay server-side |

### Recovering a payment whose order did not confirm

If the app is killed between payment and confirmation, `complete` may never reach
Razorpay. Everything needed to retry is already in the payment payload, so no extra
SDK call is required — persist it when the payment succeeds and POST it later:

```js
POST https://api.razorpay.com/v1/1cc/shopify/complete?key_id=<key>
{
  "razorpay_order_id":   "...",
  "razorpay_payment_id": "...",
  "razorpay_signature":  "...",
  "key":                 "..."
}
```

Retrying is safe — Razorpay guarantees at most one Shopify order per Razorpay order for
24 hours.

### Not supported in this release

Analytics fan-out (GA4, FB Pixel, MoEngage, Clevertap), coupon prefill UI,
abandoned-cart recovery, loyalty coins, gift cards, and WooCommerce or Magento.
````

- [ ] **Step 2: Verify the sample compiles conceptually**

```bash
npm test
```
Expected: PASS. Then re-read the README snippet against `src/types.ts` and confirm every field name matches exactly.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document openMagicCheckout"
```

---

## Pre-Ramp Gate — human and cross-team, not agent-executable

Do not publish or ramp until every row is resolved.

| # | Item | Owner |
|---|---|---|
| 1 | Task 0 passed on **both** platforms | Implementer |
| 2 | AppBrew's Storefront token carries `unauthenticated_read_product_*` for `image`, `productType`, `taxable`, `description` (assumption A4) | AppBrew |
| 3 | Confirm `MobileInit`'s passthrough carries both `order_id` and `experiments` against a real merchant. Web reads both from this response (`shopify/order.ts:54`, `handlers.ts:86`), but verify rather than infer | Magic Checkout team |
| 4 | Latency budget for `/v1/magic/shopify/init` — it sits directly in the tap-to-modal path | Magic Checkout team |
| 5 | `GET /v1/magic/shopify/order/status` load sanity-check if the pending path is later given a poll | Magic Checkout team |
| 6 | File the reconciliation-sweep ask: 1CC orders with a captured payment and no Shopify order. Closes the app-killed window, and benefits web equally | Magic Checkout team |
| 7 | End-to-end on device: cart → init → payment → Shopify order visible in Shopify admin | Implementer |
| 8 | Force a slow/failing `complete` and confirm the pending path resolves rather than erroring | Implementer |

## Monitoring after ramp

| Metric | Why |
|---|---|
| `MAGIC_COMPLETE_FAILED` by `reason` | Primary correctness alarm — each is a possible lost order |
| `MAGIC_PAYMENT_SUCCESS` minus `MAGIC_COMPLETE_SUCCESS` | The payment-without-order gauge; should trend to zero |
| `MOBILE_INIT_FAILED` by `reason` | Phase-1 endpoint health |
| `MOBILE_INIT_SUCCESS` p95 latency | Tap-to-modal stall |
| `MOBILE_CART_FETCH_FAILED` by `reason` | Distinguishes bad tokens from Shopify outages |

## Spec Coverage

| Spec section | Task |
|---|---|
| §4 three-phase flow | 10, 11 |
| §5.1 `/v1/magic/shopify/init` | 1, 2, 3, 4 |
| §5.1 security boundary (`ShopName` pinned) | 3 |
| §5.1 mapper rules (`gid`→`int64`, bare `c1-`) | 2 |
| §5.1 new mobile-only query | 1 |
| §5.2 `order_id`-only modal options | 11 |
| §5.2 listener extraction | 7 |
| §5.3 no `checkout` FE changes | 0 (verification) |
| §5.4 bounded receipt-confirmation | 10 |
| §5.4 handle documented, not built | 13 |
| §6 cross-platform seam | 9 (purity guard), 11, 12 |
| §7 error handling table | 8, 10, 11 |
| §8 testing strategy | 5, 6, and each task's tests |
| §9 A1 | 0 |
| §9 A4 | Pre-Ramp Gate #2 |
| §9 A5 | Pre-Ramp Gate #3 |
| §10 reconciliation follow-up | Pre-Ramp Gate #6 |

## Not covered here

- `checkout` (FE) changes — none required. If Task 0 fails, that changes and this plan needs revision.
- Native Android/iOS changes — none required.
- Analytics fan-out, coupon prefill, abandoned cart, Splitz sync, loyalty, gift cards, WooCommerce, Magento — out of scope per spec v6 §3.
- The `merchantevent` bridge channel — v2, and the gate on the whole event-driven feature class.
