import type { ActionDefinition } from "@w6w/types";
import { CARD_FIELDS, gqlArgs, PAGE_INFO, PipefyClient } from "../lib/client.ts";

interface Input {
  pipeId: string;
  fieldId: string;
  fieldValue: string;
  first?: number;
}

/**
 * `{ findCards(pipeId, search: {fieldId, fieldValue}) { edges { node { ...
 * } } } }` — Pipefy's own "findCards Query" example. Unlike `cards`,
 * `findCards` filters by a specific FIELD'S value rather than by title —
 * useful for "does a card with this external-system id already exist?"
 * lookups. Field ids ("slugs") are found via `phase-get`/`pipe-get`'s
 * `fields`/`start_form_fields` selections.
 */
function buildQuery(fields: Record<string, unknown>): string {
  const args = gqlArgs(fields);
  return `{ findCards(${args}) {
    edges { node { ${CARD_FIELDS} } }
    ${PAGE_INFO}
  } }`;
}

const cardFind: ActionDefinition<Input> = {
  key: "card-find",
  type: "search",
  resource: "card",
  title: "Find Cards by Field Value",
  description: "Find cards in a pipe whose given field carries an exact value.",
  params: [
    { key: "pipeId", label: "Pipe ID", type: "string", required: true },
    { key: "fieldId", label: "Field ID (slug)", type: "string", required: true },
    { key: "fieldValue", label: "Field value", type: "string", required: true },
    { key: "first", label: "Page size", type: "number", default: 20 },
  ],
  output: [
    { key: "cards", type: "array", label: "Matching cards" },
    { key: "endCursor", type: "string", label: "Cursor for the next page" },
    { key: "totalCount", type: "number", label: "Total matching cards" },
  ],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{
      findCards: {
        edges: Array<{ node: unknown }>;
        pageInfo: { endCursor: string | null };
        totalCount: number;
      };
    }>(
      buildQuery({
        pipeId: input.pipeId,
        search: { fieldId: input.fieldId, fieldValue: input.fieldValue },
        first: input.first ?? 20,
      }),
    );
    return {
      cards: data.findCards.edges.map((e) => e.node),
      endCursor: data.findCards.pageInfo.endCursor,
      totalCount: data.findCards.totalCount,
    };
  },
};

export default cardFind;
