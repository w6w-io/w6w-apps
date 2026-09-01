import type { ActionDefinition } from "@w6w/types";
import { ExaClient } from "../lib/client.ts";

interface Input {
  search?: string;
  limit?: number;
  cursor?: string;
}

interface Webset {
  id?: string;
  status?: string;
  title?: string;
  externalId?: string;
  [key: string]: unknown;
}

interface Output {
  data?: Webset[];
  hasMore?: boolean;
  nextCursor?: string | null;
  [key: string]: unknown;
}

/** GET /v0/websets — list Websets, newest first, cursor-paginated. */
const listWebsets: ActionDefinition<Input, Output> = {
  key: "list-websets",
  type: "search",
  resource: "webset",
  title: "List Websets",
  description: "List Websets, optionally filtered by id, external id, or title.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      validation: { minLength: 2, maxLength: 50 },
      hint: "Filters by id, external id, or title.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 100 },
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "From a previous call's response." },
  ],
  output: [
    { key: "data", type: "array", label: "Websets" },
    { key: "hasMore", type: "boolean", label: "Has more" },
    { key: "nextCursor", type: "string", label: "Next cursor" },
  ],

  execute(input, ctx) {
    const client = new ExaClient(ctx);
    return client.request<Output>("/v0/websets", {
      query: { search: input.search, limit: input.limit, cursor: input.cursor },
    });
  },
};

export default listWebsets;
