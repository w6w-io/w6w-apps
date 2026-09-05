import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `GET /inboxes/{inboxId}` — an inbox's details, including its parsing
 * configuration and current extraction schema. The docs describe the
 * contents in prose ("returns the inbox details, including key parsing
 * configuration and the current extraction schema") without a field list, so
 * this action returns the body verbatim.
 */
interface Input {
  inboxId: string;
}

const inboxGet: ActionDefinition<Input, unknown> = {
  key: "inbox-get",
  type: "read",
  resource: "inbox",
  title: "Get Inbox",
  description: "Get an inbox's details, including its parsing configuration and extraction schema.",
  params: [
    { key: "inboxId", label: "Inbox", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new AirparserClient(ctx).request<unknown>(
      `/inboxes/${encodeURIComponent(input.inboxId)}`,
    );
  },
};

export default inboxGet;
