import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";

/**
 * `GET /account` — the current account's settings, including its virtual
 * root and Recycle Bin folder IDs (needed by `task-create`/`folder-create` to
 * target the account root) and subscription state.
 *
 * Unlike Apify's equivalent whoami-shaped reads, nothing in Wrike's `Account`
 * schema carries live credential material — no proxy password, no signing
 * key — confirmed by reading the schema this response is documented against
 * (`metadata`, `createdDate`, `workDays`, `dateFormat`, `firstDayOfWeek`,
 * `customFields`, `name`, `recycleBinId`, `rootFolderId`, `id`,
 * `subscription`, `joinedDate`), so no field is stripped before returning.
 */
type Input = Record<string, never>;

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Fetch the current account's settings, root/Recycle Bin folder IDs and subscription.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Account name" },
    { key: "rootFolderId", type: "string", label: "Virtual root folder ID" },
    { key: "recycleBinId", type: "string", label: "Recycle Bin folder ID" },
    {
      key: "subscription",
      type: "object",
      label: "Subscription (type, paid, userLimit, suspended)",
    },
  ],

  execute(_input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one("/account");
  },
};

export default accountGet;
