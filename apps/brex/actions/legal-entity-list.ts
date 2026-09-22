import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexLegalEntity } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/legal_entities` — every legal entity on the account.
 *
 * The one place in this API where the response is **camelCase**: `displayName`,
 * `billingAddress`, `createdAt`, `isDefault`, where users, locations,
 * departments and cards are snake_case and a company mixes both. Those names are
 * Brex's and are passed through exactly as they arrive, so a field name in a
 * workflow result is the field name in Brex's docs.
 *
 * `cursor` and `limit` are the only parameters — no filters.
 */
interface Input {
  limit?: number;
  cursor?: string;
}

const legalEntityList: ActionDefinition<Input> = {
  key: "legal-entity-list",
  type: "search",
  resource: "legal-entity",
  title: "List Legal Entities",
  description: "List the account's Brex legal entities.",
  params: paginationParams(),
  output: [
    { key: "items", type: "array", label: "Legal entities" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, or null at the end" },
    { key: "count", type: "number", label: "Legal entities in this page" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).list<BrexLegalEntity>("/legal_entities", {
      query: { cursor: input.cursor, limit: input.limit },
    });
  },
};

export default legalEntityList;
