import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/inbound` — every inbound phone number configured on this account.
 *
 * Verified against `docs.bland.ai/api-v1/get/inbound`.
 */
const numberList: ActionDefinition<Record<string, never>> = {
  key: "number-list",
  type: "read",
  resource: "number",
  title: "List Numbers",
  description: "Retrieve every inbound phone number configured for this account, with settings.",
  params: [],
  output: [
    { key: "numbers", type: "array", label: "Inbound number configurations" },
  ],

  async execute(_input, ctx) {
    const res = await new BlandClient(ctx).request<{ inbound_numbers?: unknown[] }>("/v1/inbound");
    return { numbers: res.inbound_numbers ?? [] };
  },
};

export default numberList;
