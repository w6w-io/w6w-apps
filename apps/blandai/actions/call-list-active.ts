import type { ActionDefinition } from "@w6w/types";
import { BlandClient, compact } from "../lib/client.ts";

/**
 * `GET /v1/calls/active` — currently queued or in-progress calls.
 *
 * Verified against `docs.bland.ai/api-v1/get/active`. Response is the newer
 * `{"data": [...], "errors": null}` envelope. The doc lists `x-bland-org-id`
 * as a required header alongside `authorization`, but this could not be
 * confirmed against a live authenticated call (no test credential available)
 * — it is exposed here as an optional param, sent only when provided, rather
 * than assumed mandatory, since every other endpoint in this app's surface
 * authenticates on the API key alone.
 */
interface Input {
  orgId?: string;
}

const callListActive: ActionDefinition<Input> = {
  key: "call-list-active",
  type: "read",
  resource: "call",
  title: "List Active Calls",
  description: "Retrieve all currently queued or in-progress calls for this account.",
  params: [
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      hint: "Sent as x-bland-org-id if provided. Documented as required by Bland; " +
        "leave blank unless Bland support tells you otherwise.",
    },
  ],
  output: [
    { key: "calls", type: "array", label: "Active call summaries" },
  ],

  async execute(input, ctx) {
    const headers = compact({ "x-bland-org-id": input.orgId }) as Record<string, string>;
    const calls = await new BlandClient(ctx).data<unknown[]>("/v1/calls/active", { headers });
    return { calls: calls ?? [] };
  },
};

export default callListActive;
