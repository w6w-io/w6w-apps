import type { ActionDefinition } from "@w6w/types";
import { compact, ZuoraClient } from "../lib/client.ts";

interface Input {
  accountKey: string;
  productRatePlanId: string;
  contractEffectiveDate: string;
  termType: "TERMED" | "EVERGREEN";
  initialTerm?: number;
  initialTermPeriodType?: string;
  renewalTerm?: number;
  autoRenew?: boolean;
  chargeOverrides?: unknown;
}

/**
 * `POST /v1/subscriptions` — verified against
 * `developer.zuora.com/v1-api-reference/api/subscriptions/post_subscription`.
 *
 * Required by Zuora: `accountKey`, `contractEffectiveDate`, `termType` and
 * `subscribeToRatePlans` (an array whose minimal example is
 * `[{"productRatePlanId": "…"}]`). Zuora's own docs recommend "Create an
 * order" instead for anything beyond the simplest single-rate-plan,
 * single-subscription case — it is the only path that supports multiple rate
 * plans/subscriptions atomically and every later lifecycle change (renew,
 * amend, cancel) — so this action stays scoped to exactly that simplest case:
 * one new subscription, one product rate plan. See `order-create.ts` for
 * anything more.
 *
 * Note the object model: "Update a subscription" (not implemented here — see
 * the README) does not mutate a subscription in place. It creates a NEW
 * subscription object with the same name but a new id and version number, and
 * expires the old one — `subscription-get` always resolves to the latest
 * version.
 */
const action: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Create a new subscription with a single product rate plan for an existing account.",
  idempotent: true,
  params: [
    { key: "accountKey", label: "Account Key", type: "string", required: true },
    { key: "productRatePlanId", label: "Product Rate Plan ID", type: "string", required: true },
    {
      key: "contractEffectiveDate",
      label: "Contract Effective Date",
      type: "date",
      required: true,
    },
    {
      key: "termType",
      label: "Term Type",
      type: "select",
      required: true,
      default: "TERMED",
      options: [
        { value: "TERMED", label: "Termed" },
        { value: "EVERGREEN", label: "Evergreen" },
      ],
    },
    {
      key: "initialTerm",
      label: "Initial Term",
      type: "number",
      showIf: { "==": [{ var: "termType" }, "TERMED"] },
      hint: "Length of the initial term, in the unit set by Initial Term Period Type.",
    },
    {
      key: "initialTermPeriodType",
      label: "Initial Term Period Type",
      type: "select",
      default: "Month",
      showIf: { "==": [{ var: "termType" }, "TERMED"] },
      options: [
        { value: "Month", label: "Month" },
        { value: "Year", label: "Year" },
        { value: "Day", label: "Day" },
        { value: "Week", label: "Week" },
      ],
    },
    { key: "renewalTerm", label: "Renewal Term", type: "number", advanced: true },
    { key: "autoRenew", label: "Auto Renew", type: "boolean", advanced: true },
    {
      key: "chargeOverrides",
      label: "Charge Overrides (JSON)",
      type: "json",
      advanced: true,
      hint: "Raw pass-through for `subscribeToRatePlans[0].chargeOverrides` — an array of " +
        'objects such as `{"productRatePlanChargeId": "…", "price": 10}`. Optional; use ' +
        "only to override the catalog's default price/quantity for this subscription.",
    },
  ],
  output: [{ key: "subscription", type: "object", label: "Created subscription" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const body = compact({
      accountKey: input.accountKey,
      contractEffectiveDate: input.contractEffectiveDate,
      termType: input.termType,
      initialTerm: input.initialTerm,
      initialTermPeriodType: input.initialTermPeriodType,
      renewalTerm: input.renewalTerm,
      autoRenew: input.autoRenew,
      subscribeToRatePlans: [
        compact({
          productRatePlanId: input.productRatePlanId,
          chargeOverrides: input.chargeOverrides,
        }),
      ],
    });

    const headers: Record<string, string> = {};
    if (ctx.invocation?.invocationId) headers["idempotency-key"] = ctx.invocation.invocationId;

    const subscription = await client.request("/v1/subscriptions", {
      method: "POST",
      headers,
      body,
    });
    return { subscription };
  },
};

export default action;
