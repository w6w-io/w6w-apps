import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";
import type { JsonApiSingleResponse } from "../lib/client.ts";

/**
 * `GET /me` — "Get current user".
 *
 * The vendor's own documented response schema AND example for this endpoint are identical to
 * `GET /organization`'s (`name`/`slug`/`parent_id`) — almost certainly a copy-paste error in
 * Livestorm's spec rather than the real wire shape of a "current user" response. This action
 * still calls the real endpoint and returns whatever comes back verbatim; see `lib/client.ts`'s
 * module doc and this app's `README.md` for the full finding.
 */
type Input = Record<string, never>;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "identity",
  title: "Get Current User",
  description: "Get the identity behind the connected account. Note: Livestorm's own documented " +
    "response schema for this endpoint is identical to GET /organization's — see README.md.",
  params: [],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  async execute(_input, ctx) {
    const res = await new LivestormClient(ctx).request<JsonApiSingleResponse>("/me");
    return res.data;
  },
};

export default meGet;
