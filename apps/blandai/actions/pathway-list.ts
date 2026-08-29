import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `GET /v1/pathway` — every conversational pathway in the account.
 *
 * Verified against `docs.bland.ai/api-v1/get/all_pathway` (doc slug
 * `all_pathway`; real path confirmed against the "Source:" line preceding the
 * page in `llms-full.txt`: `GET https://api.bland.ai/v1/pathway`).
 *
 * The doc's response fields and example describe a SINGLE pathway
 * (`name`/`description`/`nodes`/`edges`) — byte-for-byte identical to the
 * single-pathway `GET /v1/pathway/{id}` doc — which cannot be literally right
 * for a "list all" endpoint and reads like a copy-paste in Bland's own
 * reference. Every other Bland list endpoint this app covers wraps its array
 * under a named key (`voices`, `inbound_numbers`, `calls`), so this action
 * accepts either shape: `{pathways: [...]}`, a bare array, or (matching the
 * doc literally) a single pathway object.
 */
const pathwayList: ActionDefinition<Record<string, never>> = {
  key: "pathway-list",
  type: "read",
  resource: "pathway",
  title: "List Pathways",
  description: "Returns every conversational pathway in the account, including nodes and edges.",
  params: [],
  output: [
    { key: "pathways", type: "array", label: "Pathway objects" },
  ],

  async execute(_input, ctx) {
    const body = await new BlandClient(ctx).request<unknown>("/v1/pathway");
    if (Array.isArray(body)) return { pathways: body };
    const wrapped = (body as { pathways?: unknown[] } | null)?.pathways;
    if (Array.isArray(wrapped)) return { pathways: wrapped };
    return { pathways: body ? [body] : [] };
  },
};

export default pathwayList;
