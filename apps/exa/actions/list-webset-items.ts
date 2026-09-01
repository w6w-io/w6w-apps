import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";

interface Input {
  websetId: string;
  sourceId?: string;
  limit?: number;
  cursor?: string;
}

interface WebsetItem {
  id?: string;
  websetId?: string;
  source?: string;
  sourceId?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Output {
  data?: WebsetItem[];
  hasMore?: boolean;
  nextCursor?: string | null;
  [key: string]: unknown;
}

/** GET /v0/websets/{webset}/items — the entities a Webset has found so far. */
const listWebsetItems: ActionDefinition<Input, Output> = {
  key: "list-webset-items",
  type: "search",
  resource: "webset-item",
  title: "List Webset Items",
  description: "List the items (entities) a Webset has found so far.",
  params: [
    {
      key: "websetId",
      label: "Webset ID",
      type: "string",
      required: true,
      hint: "The Webset's id, or your own externalId.",
    },
    { key: "sourceId", label: "Source ID", type: "string", hint: "Filter to one search/import." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 100 },
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "From a previous call's response." },
  ],
  output: [
    { key: "data", type: "array", label: "Items" },
    { key: "hasMore", type: "boolean", label: "Has more" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Output>(`/v0/websets/${encodeURIComponent(input.websetId)}/items`, {
      query: { sourceId: input.sourceId, limit: input.limit, cursor: input.cursor },
    });
  },
};

export default listWebsetItems;
