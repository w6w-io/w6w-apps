import type { ActionDefinition } from "@w6w/types";
import { BubbleClient, compact, formatTypeName, parseJson } from "../lib/client.ts";
import { LIST_PARAMS, TYPE_PARAM } from "../lib/params.ts";
import type { DataConstraint } from "../lib/client.ts";

interface Input {
  type: string;
  limit?: number;
  cursor?: number;
  sortField?: string;
  descending?: boolean;
  constraints?: string | DataConstraint[];
  excludeRemaining?: boolean;
}

interface ListResponse {
  response: { results: unknown[]; cursor: number; count: number; remaining: number };
}

/**
 * `GET /obj/{type}` — verified against `core-resources/api/the-bubble-api/the-data-api/data-api-requests`.
 *
 * Search for and retrieve a page of things of a Data Type, with optional
 * constraints, sorting and pagination. Returns Bubble's raw page — `results`,
 * `cursor` (rank of the first item), `count` (items in this page) and
 * `remaining` (items left, unless `excludeRemaining` was set).
 *
 * The Data Type must be checked on in Settings → API → Data API Settings, and
 * `Find this in searches` must be enabled on its Privacy Rule, or Bubble
 * answers 404/empty results even with a valid token.
 */
const action: ActionDefinition<Input, ListResponse["response"]> = {
  key: "data-list",
  type: "search",
  resource: "data",
  title: "List Things",
  description: "Search a Data Type with optional constraints, sorting and pagination.",
  params: [TYPE_PARAM, ...LIST_PARAMS],
  output: [
    { key: "results", label: "Results", type: "array" },
    { key: "cursor", label: "Cursor", type: "number" },
    { key: "count", label: "Count", type: "number" },
    { key: "remaining", label: "Remaining", type: "number" },
  ],

  async execute(input, ctx) {
    const type = formatTypeName(input.type);
    const client = new BubbleClient(ctx);

    const constraints = parseJson(input.constraints, "constraints");
    if (constraints !== undefined && !Array.isArray(constraints)) {
      throw new Error("`constraints` must be a JSON array");
    }

    ctx.log("info", "listing Bubble things", { type, limit: input.limit ?? 100 });

    const body = await client.request<ListResponse>(`/obj/${type}`, {
      query: compact({
        limit: input.limit,
        cursor: input.cursor,
        sort_field: input.sortField,
        descending: input.sortField ? String(input.descending === true) : undefined,
        constraints: constraints ? JSON.stringify(constraints) : undefined,
        exclude_remaining: input.excludeRemaining === true ? "true" : undefined,
      }),
    });
    return body.response;
  },
};

export default action;
