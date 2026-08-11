import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, stripSecrets } from "../lib/client.ts";

/**
 * `GET /v2/users/me` — the account behind this connection.
 *
 * The reason to call it is `username`: Apify's `username~resource-name`
 * addressing form — accepted by nearly every path parameter in this app — is
 * unusable without knowing it.
 *
 * ## One field is removed from the response, and it is the important one
 *
 * `UserPrivateInfo` contains `proxy: {password, groups}`, and that `password` is
 * the account's **Apify Proxy password** — the entire credential for
 * `proxy.apify.com`. Apify returns it in full to any caller holding the API
 * token, inside what otherwise reads like an ordinary profile lookup.
 *
 * A workflow step's result is persisted in the run record and routinely echoed
 * into logs, previews and downstream steps, so returning it would copy a working
 * credential into durable storage on every call. It is deleted here (see
 * `REDACTED_FIELDS` in `lib/client.ts`); `proxy.groups`, which is not secret, is
 * kept. The password remains visible to its owner in Apify Console.
 *
 * This is also why this endpoint is **not** the connection's health probe:
 * `auth/api-token.ts` probes `/v2/users/me/limits` instead, which needs a
 * credential, is reachable by a scoped token, and returns nothing secret at all.
 * Follow Up Boss's `/me` and Mailjet's `/apikey` are the same trap and are
 * banned pack-wide for the same reason.
 *
 * ## Fields that disappear inside a run
 *
 * Apify documents that `plan`, `email` and `profile` are omitted when this
 * endpoint is called from inside an Actor run. Nothing here depends on them.
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Fetch the connected Apify account's profile. The Apify Proxy password is removed from the " +
    "response.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username — the prefix in `username~resource`" },
    { key: "email", type: "string", label: "Email — absent when called from inside a run" },
    { key: "plan", type: "object", label: "Plan — absent when called from inside a run" },
    { key: "proxy", type: "object", label: "Proxy groups. The proxy password is removed" },
    { key: "isPaying", type: "boolean", label: "Whether the account is on a paid plan" },
  ],

  async execute(_input, ctx) {
    const user = await new ApifyClient(ctx).data<Record<string, unknown>>("/users/me");
    return stripSecrets(user);
  },
};

export default accountGet;
