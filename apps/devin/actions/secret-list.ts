import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  DevinClient,
  type DevinListPage,
  type SearchResult,
  toSearchResult,
} from "../lib/client.ts";
import { cursorParams } from "../lib/params.ts";

interface SecretSummary {
  secret_id: string;
  key: string | null;
  is_sensitive: boolean;
  access_type: "org" | "personal";
  note: string | null;
  created_at: number;
  created_by: string;
}

/**
 * `GET /v3/organizations/{org_id}/secrets` — every org-level secret, by id
 * and key only. Values are never returned by any Devin v3 endpoint.
 */
interface Input {
  cursor?: string;
  limit?: number;
}

const secretList: ActionDefinition<Input, SearchResult<SecretSummary>> = {
  key: "secret-list",
  type: "search",
  resource: "secret",
  title: "List Secrets",
  description: "List org-level secrets. Values are never returned.",
  params: cursorParams(100),
  output: [
    { key: "items", type: "array", label: "Secrets" },
    { key: "nextCursor", type: "string", label: "Pass into `cursor` for the next page" },
  ],

  async execute(input, ctx) {
    const page = await new DevinClient(ctx).org<DevinListPage<SecretSummary>>("/secrets", {
      query: compact({ after: input.cursor, first: input.limit }),
    });
    return toSearchResult(page);
  },
};

export default secretList;
