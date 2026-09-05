import type { ActionDefinition } from "@w6w/types";
import { REGION_OPTIONS, ZeroBounceClient } from "../lib/client.ts";

interface Input {
  emails: string[];
  ipAddresses?: string[];
  region?: string;
}

/**
 * `POST /v2/validatebatch` — validate up to a batch of email addresses in
 * one synchronous call. Source: the vendor's Postman collection / example
 * POST body embedded in
 * `https://www.zerobounce.net/docs/email-validation-api-quickstart`.
 *
 * Unlike every other endpoint this app calls, the API key travels as an
 * `api_key` field in the JSON request body, not a query parameter — see
 * `lib/client.ts`'s module doc and `auth/api-key.ts`'s `sign` hook, which
 * handles this by branching on whether the outbound request has a body.
 *
 * The response is `{"email_batch": [...], "errors": [...]}` — a mix of
 * per-address results and per-address (or account-wide, `email_address:
 * "all"`) failures in the *same* call, so this app returns the vendor's
 * envelope verbatim rather than throwing on a partial failure.
 *
 * No documented maximum batch size was found in the vendor's own docs (only
 * that "the API requires an active credit balance and will never consume a
 * credit for any unknown result") — left unenforced here rather than
 * inventing a limit.
 *
 * `perform`, not `read`: it is a bulk, billable call and it is not safe to
 * retry blindly on a partial failure (a retry would re-spend credits on the
 * addresses that already succeeded), so `idempotent: false`.
 */
const validateBatch: ActionDefinition<Input> = {
  key: "validate-batch",
  type: "perform",
  resource: "email",
  title: "Validate Email Batch",
  description: "Validate several email addresses in one call.",
  idempotent: false,
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "string",
      repeat: true,
      required: true,
      hint: "The addresses to validate.",
    },
    {
      key: "ipAddresses",
      label: "IP Addresses",
      type: "string",
      repeat: true,
      hint: "Optional, index-aligned with Emails — the IP address each address signed up from, " +
        "if known. Leave an entry blank to omit it for that address.",
      advanced: true,
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "default",
      options: REGION_OPTIONS,
      hint: "Pin the request to a specific data-residency region. Leave as Default unless your " +
        "account requires US- or EU-only processing.",
      advanced: true,
    },
  ],
  output: [
    { key: "email_batch", type: "array", label: "Validated results" },
    { key: "errors", type: "array", label: "Per-address or account-wide errors, if any" },
  ],

  execute(input, ctx) {
    const client = new ZeroBounceClient(ctx);
    const email_batch = input.emails.map((email_address, i) => ({
      email_address,
      ip_address: input.ipAddresses?.[i] || undefined,
    }));
    return client.request("/v2/validatebatch", {
      method: "POST",
      region: input.region,
      body: { email_batch },
    });
  },
};

export default validateBatch;
