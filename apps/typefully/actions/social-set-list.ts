import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/**
 * `GET /v2/social-sets` — every social set (account) this key's user can
 * access, including ones owned by teams they belong to. `limit` defaults to
 * 10, max 50, per the vendor's own default on this endpoint.
 */
const socialSetList: ActionDefinition<Input> = {
  key: "social-set-list",
  type: "search",
  resource: "social-set",
  title: "List Social Sets",
  description: "List the social sets (accounts) this API key's user can access.",
  params: paginationParams(10, 50),
  output: [
    { key: "results", type: "array", label: "Social sets" },
    { key: "count", type: "number", label: "Total available" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Offset used" },
    { key: "next", type: "string", label: "Next page URL, or null" },
    { key: "previous", type: "string", label: "Previous page URL, or null" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json("/social-sets", {
      query: { limit: input.limit, offset: input.offset },
    });
  },
};

export default socialSetList;
