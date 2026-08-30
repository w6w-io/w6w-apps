import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";

/**
 * `GET /me` — the connected account's own profile.
 *
 * Confirmed response shape (vendor's own example): `{user_id, username, email,
 * terms_and_conditions, marketing_communications_opt_in,
 * tailored_experience_opt_in, third_parties_data_opt_in, created_at}`. Nothing
 * secret is returned — this is also the Auth `test` probe (`auth/oauth2.ts`),
 * chosen specifically because this endpoint returns no credential material.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the connected VideoAsk account's own profile.",
  params: [],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "terms_and_conditions", type: "boolean", label: "Accepted terms and conditions" },
    { key: "created_at", type: "string", label: "Account creation time" },
  ],

  execute(_input, ctx) {
    return new VideoAskClient(ctx).entity("/me");
  },
};

export default accountGet;
