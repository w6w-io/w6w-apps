import type { ActionDefinition } from "@w6w/types";
import { compactBody, WiseClient } from "../lib/client.ts";
import {
  payOutParam,
  profileIdParam,
  sourceCurrencyParam,
  targetCurrencyParam,
} from "../lib/params.ts";

/**
 * `POST /profiles/{profileId}/quotes` — create an **authenticated** quote, the
 * first of the two resources (quote + recipient) a transfer needs.
 *
 * ## Two kinds of quote, and this is the one that leads to a transfer
 *
 * Wise's `quote` tag distinguishes **unauthenticated** quotes (illustrative
 * rates only, no ID, cannot become a transfer — see `POST /quotes`, not
 * covered by this app) from **authenticated** quotes, which are tied to a
 * profile and are the only kind Quote Update / Transfer Create accept.
 *
 * ## Exactly one of `sourceAmount` / `targetAmount`
 *
 * The vendor documents these as mutually exclusive: "Either `sourceAmount` or
 * `targetAmount` is required, never both." This is enforced here before the
 * request is sent, because Wise's own validation error for getting it wrong
 * is a generic 400 that does not name which of the two is the problem.
 *
 * ## A documented auth-scope gap
 *
 * The OpenAPI bundle's `security` for this exact operation lists **`UserToken`
 * only** — no `PersonalToken` entry — even though the personal-API-token guide
 * states a personal token covers "creating quotes". See `auth/api-token.ts`
 * for the full discrepancy. A personal-token connection that gets a
 * scope-shaped 403 here is hitting that gap, not a bug in this action.
 */
interface Input {
  profileId: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
  targetAccount?: number;
  payOut?: string;
  preferredPayIn?: string;
}

const quoteCreate: ActionDefinition<Input> = {
  key: "quote-create",
  type: "perform",
  resource: "quote",
  title: "Create Quote",
  description: "Create an authenticated quote for a transfer: currencies, amount, and profile.",
  idempotent: false,
  params: [
    profileIdParam,
    sourceCurrencyParam,
    targetCurrencyParam,
    {
      key: "sourceAmount",
      label: "Source amount",
      type: "number",
      hint: "Amount in the source currency to send. Provide exactly one of source/target amount.",
    },
    {
      key: "targetAmount",
      label: "Target amount",
      type: "number",
      hint:
        "Amount in the target currency to be received. Provide exactly one of source/target amount.",
    },
    {
      key: "targetAccount",
      label: "Recipient account ID",
      type: "number",
      hint:
        "Optional. The recipient account ID from Create Recipient. Can also be set later with " +
        "Update Quote.",
    },
    payOutParam,
    {
      key: "preferredPayIn",
      label: "Preferred pay-in method",
      type: "string",
      hint: 'Optional. Use "BANK_TRANSFER" to return that method at the top of the response.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Quote ID (UUID)" },
    { key: "rate", type: "number", label: "Exchange rate" },
    { key: "sourceAmount", type: "number", label: "Amount in source currency" },
    { key: "targetAmount", type: "number", label: "Amount in target currency" },
  ],

  execute(input, ctx) {
    if (input.sourceAmount != null && input.targetAmount != null) {
      throw new Error("Provide exactly one of sourceAmount or targetAmount, not both");
    }
    if (input.sourceAmount == null && input.targetAmount == null) {
      throw new Error("Provide exactly one of sourceAmount or targetAmount");
    }
    ctx.log("info", "creating Wise quote", {
      profileId: input.profileId,
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
    });
    return new WiseClient(ctx).json(`/profiles/${input.profileId}/quotes`, {
      method: "POST",
      body: compactBody({
        sourceCurrency: input.sourceCurrency,
        targetCurrency: input.targetCurrency,
        sourceAmount: input.sourceAmount,
        targetAmount: input.targetAmount,
        targetAccount: input.targetAccount,
        payOut: input.payOut,
        preferredPayIn: input.preferredPayIn,
      }),
    });
  },
};

export default quoteCreate;
