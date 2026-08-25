import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";

/**
 * `GET /user` — the connected account's own profile: name, emails,
 * subscription plan, document counts, organization membership.
 */
const userGet: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Account Info",
  description: "Retrieve the connected SignNow account's profile.",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "primary_email", type: "string", label: "Primary email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "document_count", type: "number", label: "Document count" },
  ],

  execute(_input, ctx) {
    return new SignNowClient(ctx).request("/user");
  },
};

export default userGet;
