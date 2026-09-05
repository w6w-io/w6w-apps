import type { ActionDefinition } from "@w6w/types";
import { CARD_FIELDS, gqlArgs, PAGE_INFO, PipefyClient } from "../lib/client.ts";

interface Input {
  pipeId: string;
  title?: string;
  first?: number;
  after?: string;
}

/**
 * `{ cards(pipe_id, search: {title}, first, after) { edges { node { ... } }
 * pageInfo { endCursor } totalCount } }` — Pipefy's own "Cards Query"
 * example (`pipe_id`, `search: {title: "..."}`) plus the Relay-style
 * `first`/`after` pagination arguments confirmed on the sibling `tables`
 * connection in Pipefy's "Limits and Best Practices" guide — the same
 * connection shape (`edges { node }`, `pageInfo`, `totalCount`) as `cards`.
 */
function buildQuery(fields: Record<string, unknown>): string {
  const args = gqlArgs(fields);
  return `{ cards(${args}) {
    edges { node { ${CARD_FIELDS} } }
    ${PAGE_INFO}
  } }`;
}

const cardList: ActionDefinition<Input> = {
  key: "card-list",
  type: "search",
  resource: "card",
  title: "List Cards",
  description: "List cards in a pipe, optionally filtered by title.",
  params: [
    { key: "pipeId", label: "Pipe ID", type: "string", required: true },
    { key: "title", label: "Title contains", type: "string" },
    { key: "first", label: "Page size", type: "number", default: 20 },
    { key: "after", label: "Cursor (from a previous page's endCursor)", type: "string" },
  ],
  output: [
    { key: "cards", type: "array", label: "Cards" },
    { key: "endCursor", type: "string", label: "Cursor for the next page" },
    { key: "totalCount", type: "number", label: "Total matching cards" },
  ],

  async execute(input, ctx) {
    const search = input.title ? { title: input.title } : undefined;
    const data = await new PipefyClient(ctx).send<{
      cards: {
        edges: Array<{ node: unknown }>;
        pageInfo: { endCursor: string | null };
        totalCount: number;
      };
    }>(
      buildQuery({
        pipe_id: input.pipeId,
        search,
        first: input.first ?? 20,
        after: input.after,
      }),
    );
    return {
      cards: data.cards.edges.map((e) => e.node),
      endCursor: data.cards.pageInfo.endCursor,
      totalCount: data.cards.totalCount,
    };
  },
};

export default cardList;
