import type { ActionDefinition } from "@w6w/types";
import { KeapClient, V2 } from "../lib/client.ts";

/**
 * `GET /rest/v2/businessProfile` — the account's own business profile.
 *
 * Name, email, phone, address, time zone, logo, currency and language for the
 * Keap app this connection points at — the fields a workflow needs to build a
 * branded message or to reason about the account's currency.
 *
 * ## This is the v2 replacement for v1's `/account/profile`
 *
 * The two return the same information under different schema names
 * (`GetBusinessProfileResponse` vs `AccountProfile`) with one difference worth
 * noting: v1 also returns `phone_ext`, which v2 drops. v2 is used here anyway,
 * per this app's "v2 unless v2 lacks the resource" rule, because an extension
 * field is not worth pinning a resource to the older surface.
 *
 * This is also the endpoint whose *v1* form the parent research verified live —
 * `GET /crm/rest/v1/account/profile` answers a real JSON 401 unauthenticated —
 * which is how the API's reachability was established without a credential.
 */
const businessProfileGet: ActionDefinition<Record<string, never>> = {
  key: "business-profile-get",
  type: "read",
  title: "Get Business Profile",
  resource: "account",
  description:
    "Read the connected Keap account's business profile: name, contact details, address, time " +
    "zone, currency and branding.",
  params: [],
  output: [
    { key: "name", type: "string", label: "Business name" },
    { key: "email", type: "string", label: "Business email" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "currency_code", type: "string", label: "Currency (ISO 4217)" },
    { key: "address", type: "object", label: "Address" },
  ],

  execute(_input, ctx) {
    const client = new KeapClient(ctx);
    return client.json(`${V2}/businessProfile`);
  },
};

export default businessProfileGet;
