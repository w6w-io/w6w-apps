import type { ActionDefinition } from "@w6w/types";
import { compact, ZuoraClient } from "../lib/client.ts";

interface Input {
  existingAccountKey: string;
  existingAccountKeyType: "existingAccountId" | "existingAccountNumber";
  orderDate: string;
  description?: string;
  category?: "NewSales" | "Return";
  subscriptions: unknown;
}

/**
 * `POST /v1/orders` — verified against
 * `developer.zuora.com/v1-api-reference/api/orders/post_order` (a genuinely
 * huge request schema — 5,000+ documented fields once every order-action
 * variant is counted).
 *
 * Note: this operation is only available if the ORDERS feature is enabled on
 * the tenant (Zuora's own note on the endpoint). If disabled, use
 * `subscription-create` for the single-subscription case Orders would
 * otherwise be needed for.
 *
 * ## Why `subscriptions` is raw JSON, not a typed param tree
 *
 * An order's `subscriptions` array is a list of order-action bundles — add a
 * product, remove one, renew, cancel, change owner, replace a rate plan, and
 * more — each with its own deeply nested request shape. Modelling that
 * faithfully as `Param[]` here would mean re-deriving a large fraction of
 * Zuora's own object model, and modelling only the common cases would silently
 * hide the rest. Per the app's build guidance ("leave it out and say so" for
 * anything that can't be modelled correctly), this action passes the
 * documented `subscriptions` field straight through as JSON, in EXACTLY the
 * shape Zuora's own reference gives as its example for creating one new
 * subscription via an order:
 *
 * ```json
 * [{
 *   "orderActions": [{
 *     "type": "CreateSubscription",
 *     "createSubscription": {
 *       "terms": {
 *         "initialTerm": {"period": 12, "periodType": "Month", "termType": "TERMED"},
 *         "renewalSetting": "RENEW_WITH_SPECIFIC_TERM",
 *         "renewalTerms": [{"period": 12, "periodType": "Month"}]
 *       },
 *       "subscribeToRatePlans": [{"productRatePlanId": "8ad081dd9096ef9501909b40bb4e74a4"}]
 *     }
 *   }]
 * }]
 * ```
 *
 * Sets `Idempotency-Key` from the invocation id — safe here because this is a
 * POST (see `lib/client.ts`'s module doc).
 */
const action: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order",
  description: "Create an order — subscriptions and the order actions applied to them. " +
    "Requires the Orders feature to be enabled on the tenant.",
  idempotent: true,
  params: [
    {
      key: "existingAccountKeyType",
      label: "Account Key Type",
      type: "select",
      required: true,
      default: "existingAccountId",
      options: [
        { value: "existingAccountId", label: "Account ID" },
        { value: "existingAccountNumber", label: "Account Number" },
      ],
    },
    { key: "existingAccountKey", label: "Account Key", type: "string", required: true },
    { key: "orderDate", label: "Order Date", type: "date", required: true },
    {
      key: "subscriptions",
      label: "Subscriptions (JSON)",
      type: "json",
      required: true,
      hint: "Zuora's documented `subscriptions` array — see this action's source comment for " +
        "the exact shape of the single-new-subscription example, or the order-actions section " +
        "of the Zuora v1 API reference for every other order-action type.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      advanced: true,
      options: [
        { value: "NewSales", label: "New Sales" },
        { value: "Return", label: "Return" },
      ],
    },
    { key: "description", label: "Description", type: "text", advanced: true },
  ],
  output: [{ key: "order", type: "object", label: "Created order" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const body = compact({
      [input.existingAccountKeyType]: input.existingAccountKey,
      orderDate: input.orderDate,
      subscriptions: input.subscriptions,
      category: input.category,
      description: input.description,
    });

    const headers: Record<string, string> = {};
    if (ctx.invocation?.invocationId) headers["idempotency-key"] = ctx.invocation.invocationId;

    const order = await client.request("/v1/orders", { method: "POST", headers, body });
    return { order };
  },
};

export default action;
