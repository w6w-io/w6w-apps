import type { ActionDefinition } from "@w6w/types";
import { asJson, compactBody, WiseClient } from "../lib/client.ts";

/**
 * `POST /accounts` — create a recipient (beneficiary) account.
 *
 * ## `details` is currency-route-specific, by design
 *
 * Wise's own description: "The required fields inside the `details` object
 * depend on currency, type, legalType, and country. Use the account-requirements
 * endpoints to discover the exact required fields." GBP wants `sortCode` +
 * `accountNumber`; USD wants a routing number, account number and account
 * type; INR wants an IFSC code; and so on across dozens of currency routes.
 * Generating one form per route is out of scope for this app (see the
 * README's "Deliberately not covered" section on the account-requirements
 * endpoints), so `details` is a free-form JSON object the caller fills in
 * for the route they already know — the same shape Wise's own request body
 * documents it as.
 *
 * ## A documented auth-scope gap
 *
 * The OpenAPI bundle's `security` for this operation lists **`UserToken`
 * only** — no `PersonalToken` — even though the personal-API-token guide
 * states a personal token covers "retrieving and creating recipients". See
 * `auth/api-token.ts` for the full discrepancy.
 */
interface Input {
  currency: string;
  type: string;
  profile?: number;
  accountHolderName: string;
  ownedByCustomer?: boolean;
  details?: unknown;
}

const recipientCreate: ActionDefinition<Input> = {
  key: "recipient-create",
  type: "perform",
  resource: "recipient",
  title: "Create Recipient",
  description: "Create a recipient (beneficiary) account for a specific currency and account type.",
  idempotent: false,
  params: [
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      placeholder: "GBP",
      hint: "3-letter ISO 4217 code the recipient will be paid in.",
    },
    {
      key: "type",
      label: "Account type",
      type: "string",
      required: true,
      placeholder: "sort_code",
      hint:
        "Currency/route-specific, e.g. sort_code, iban, email. See Retrieve Recipient Account " +
        "Requirements in Wise's docs for the valid types per route.",
    },
    {
      key: "profile",
      label: "Profile ID",
      type: "number",
      hint: "Sender's personal or business profile ID. Recommended: pass the business profile ID " +
        "if multiple users manage the account, so all of them can access this recipient.",
    },
    {
      key: "accountHolderName",
      label: "Account holder name",
      type: "string",
      required: true,
      hint: "The recipient's full name.",
    },
    {
      key: "ownedByCustomer",
      label: "Owned by customer",
      type: "boolean",
      hint: "Set true for self-transfers (the profile owner's own account in another country or " +
        "currency) — this improves routing and processing.",
    },
    {
      key: "details",
      label: "Account details",
      type: "json",
      hint:
        "Route-specific fields (sortCode/accountNumber, IBAN, routing number, IFSC, legalType, " +
        "dateOfBirth, …). Passed through verbatim — see Wise's account-requirements endpoint for " +
        "what a given currency/type needs.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New recipient account ID" },
    { key: "currency", type: "string", label: "Target currency" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Wise recipient", { currency: input.currency, type: input.type });
    return new WiseClient(ctx).json("/accounts", {
      method: "POST",
      body: compactBody({
        currency: input.currency,
        type: input.type,
        profile: input.profile,
        accountHolderName: input.accountHolderName,
        ownedByCustomer: input.ownedByCustomer,
        details: input.details === undefined ? undefined : asJson(input.details, "Account details"),
      }),
    });
  },
};

export default recipientCreate;
