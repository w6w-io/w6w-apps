import type { ActionDefinition } from "@w6w/types";
import { compactBody, WiseClient } from "../lib/client.ts";
import { payOutParam, profileIdParam } from "../lib/params.ts";

/**
 * `PATCH /profiles/{profileId}/quotes/{quoteId}` — attach a recipient (and
 * optionally change the payout method) to an existing quote.
 *
 * ## The one non-`application/json` request body in this app
 *
 * Wise documents this endpoint's request body under
 * `application/merge-patch+json`, not `application/json` — confirmed in the
 * OpenAPI bundle's `requestBody.content` key, not inferred from the verb.
 * Sending the ordinary JSON content type here is a real, documented way to
 * get a 415, so {@link WiseClient.json}'s `contentType` override exists
 * specifically for this call.
 */
interface Input {
  profileId: number;
  quoteId: string;
  targetAccount: number;
  payOut?: string;
}

const quoteUpdate: ActionDefinition<Input> = {
  key: "quote-update",
  type: "perform",
  resource: "quote",
  title: "Update Quote",
  description: "Attach a recipient account (and optionally a payout method) to an existing quote.",
  // A merge-patch is a full state assignment for the fields it names — safe to
  // repeat with the same input, unlike an action that appends.
  idempotent: true,
  params: [
    profileIdParam,
    {
      key: "quoteId",
      label: "Quote ID",
      type: "string",
      required: true,
      hint: "UUID from Create Quote's response.",
    },
    {
      key: "targetAccount",
      label: "Recipient account ID",
      type: "number",
      required: true,
      hint: "The recipient account ID from Create Recipient.",
    },
    payOutParam,
  ],
  output: [
    { key: "id", type: "string", label: "Quote ID" },
    { key: "payOut", type: "string", label: "Payout method now in effect" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(`/profiles/${input.profileId}/quotes/${input.quoteId}`, {
      method: "PATCH",
      contentType: "application/merge-patch+json",
      body: compactBody({ targetAccount: input.targetAccount, payOut: input.payOut }),
    });
  },
};

export default quoteUpdate;
