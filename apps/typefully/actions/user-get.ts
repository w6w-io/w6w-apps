import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";

/**
 * `GET /v2/me` — the Typefully user behind this connection.
 *
 * Also this app's Auth `test` probe (`auth/api-key.ts`) — the response carries
 * only account identity, no credential material, so it is safe to expose as
 * both.
 */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the Typefully user that owns this API key.",
  params: [],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "profile_image_url", type: "string", label: "Profile image URL" },
    { key: "signup_date", type: "string", label: "Signup date (ISO 8601)" },
    { key: "api_key_label", type: "string", label: "Label of the API key used, if set" },
  ],

  async execute(_input, ctx) {
    return await new TypefullyClient(ctx).json("/me");
  },
};

export default userGet;
