import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/**
 * `GET /me` — the Wise user account behind this token.
 *
 * Unlike Follow Up Boss's `/me` or Mailjet's `/apikey`, this does **not**
 * return the caller's own credential — the `User` schema is `{id, name,
 * email, active, details: {firstName, lastName, phoneNumber, dateOfBirth,
 * ...}}`, account profile data, not a key. It was still checked against that
 * schema before being wired up, rather than assumed safe from the endpoint
 * name.
 *
 * Note: this endpoint is not on the short, explicit list the personal-API-
 * token guide states a personal token covers ("creating quotes, retrieving
 * and creating recipients, creating transfers and batch groups, and tracking
 * transfer events") — even though the OpenAPI bundle's `security` for this
 * operation accepts `PersonalToken`. A personal-token connection that gets a
 * scope-shaped 403 here is hitting that same guide-vs-spec gap documented in
 * `auth/api-token.ts`.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get the Wise user account this connection authenticates as.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(_input, ctx) {
    return new WiseClient(ctx).json("/me");
  },
};

export default accountGet;
