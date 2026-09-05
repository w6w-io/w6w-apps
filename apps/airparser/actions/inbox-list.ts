import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `GET /inboxes` — the account's inboxes.
 *
 * This is also the credential-liveness probe in `auth/api-key.ts` — see that
 * file for why. The docs show no sample response for this endpoint, so the
 * result is returned exactly as Airparser answers it rather than assuming a
 * shape.
 */
type Input = Record<string, never>;

const inboxList: ActionDefinition<Input, unknown> = {
  key: "inbox-list",
  type: "search",
  resource: "inbox",
  title: "List Inboxes",
  description: "List the account's inboxes.",
  params: [],

  execute(_input, ctx) {
    return new AirparserClient(ctx).request<unknown>("/inboxes");
  },
};

export default inboxList;
