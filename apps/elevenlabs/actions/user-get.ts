import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, stripSecrets } from "../lib/client.ts";

/**
 * `GET /v1/user` — the account behind this connection.
 *
 * ## One field is removed from the response, and it is the important one
 *
 * `UserResponseModel.xi_api_key` is documented as "The API key of the user", and
 * the vendor's own schema example carries a full key
 * (`"xi_api_key": "8so27l7327189x0h939ekx293380l920"`). ElevenLabs returns it in
 * full to any caller holding that key, inside what otherwise reads like an
 * ordinary profile lookup.
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, previews and downstream steps, so returning it would copy a working
 * credential into durable storage on every call. It is deleted here (see
 * `stripSecrets` in `lib/client.ts`).
 *
 * `xi_api_key_preview` — the vendor's own masked form — is deliberately kept:
 * it answers "which key is this connection using?" without handing the key over.
 * `is_api_key_hashed` is kept for the same reason.
 *
 * This is also why this endpoint is **not** the connection's health probe:
 * `auth/api-key.ts` probes `/v1/user/subscription` instead, which needs a
 * credential and returns nothing secret at all. Follow Up Boss's `/me` and
 * Mailjet's `/apikey` are the same trap and are banned pack-wide for the same
 * reason.
 */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "account",
  title: "Get User",
  description:
    "Fetch the connected account's profile. The account's own API key is removed from the " +
    "response; the vendor's masked preview of it is kept.",
  params: [],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "seat_type", type: "string", label: "Seat type in the workspace" },
    { key: "created_at", type: "number", label: "Account creation, Unix seconds" },
    { key: "subscription", type: "object", label: "Subscription summary" },
    {
      key: "xi_api_key_preview",
      type: "string",
      label: "Masked preview of the key. The full key is removed",
    },
  ],

  async execute(_input, ctx) {
    const user = await new ElevenLabsClient(ctx).json<Record<string, unknown>>("/v1/user");
    return stripSecrets(user);
  },
};

export default userGet;
