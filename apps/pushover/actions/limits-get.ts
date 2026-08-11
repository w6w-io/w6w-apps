import type { ActionDefinition } from "@w6w/types";
import { PushoverClient } from "../lib/client.ts";

/**
 * `GET /1/apps/limits.json` — how many messages are left this month.
 *
 * Pushover meters **messages per month**, not requests per second: 10,000 on a
 * free account and 25,000 for a Team, and — the part worth knowing — the
 * allowance belongs to the *account*, shared by every application on it. The
 * vendor's own note on the header names says so: "for historical reasons, the
 * headers refer to 'app' limits but this is now representing the limit for the
 * entire user or team."
 *
 * `reset` is a Unix timestamp of when the counter rolls over.
 *
 * Every message response also carries the same three numbers as `X-Limit-App-*`
 * headers, which `lib/client.ts` folds into the result — so a workflow that
 * sends regularly rarely needs this action. It exists for the case where you
 * want the number *before* deciding to send, and it is what the `quota` health
 * check reads.
 *
 * Application-scoped: takes the application token and no user key.
 */
const limitsGet: ActionDefinition<Record<string, never>> = {
  key: "limits-get",
  type: "read",
  resource: "limit",
  title: "Get Message Limits",
  description:
    "Get the monthly message allowance, how much of it is left, and when it resets. The allowance " +
    "belongs to the account and is shared across all of its applications.",
  params: [],
  output: [
    { key: "limit", type: "number", label: "Messages allowed this month" },
    { key: "remaining", type: "number", label: "Messages left" },
    { key: "reset", type: "number", label: "Unix timestamp of the next reset" },
  ],

  execute(_input, ctx) {
    return new PushoverClient(ctx).request("/1/apps/limits.json", { method: "GET" });
  },
};

export default limitsGet;
