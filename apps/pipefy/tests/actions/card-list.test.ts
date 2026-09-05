import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardList from "../../actions/card-list.ts";

Deno.test("card-list: lists cards in a pipe with default pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        cards: {
          edges: [{ node: { id: "1", title: "Deal" } }],
          pageInfo: { endCursor: "abc" },
          totalCount: 1,
        },
      },
    },
  }]);
  const out = await cardList.execute({ pipeId: "123" }, ctx) as {
    cards: unknown[];
    endCursor: string;
    totalCount: number;
  };
  assertEquals(out.cards.length, 1);
  assertEquals(out.endCursor, "abc");
  assertEquals(out.totalCount, 1);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ cards(pipe_id: 123, first: 20) {"));
  assert(q.includes("edges { node {"));
  assert(q.includes("pageInfo { endCursor } totalCount"));
});

Deno.test("card-list: filters by title and supports a cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { cards: { edges: [], pageInfo: { endCursor: null }, totalCount: 0 } } },
  }]);
  await cardList.execute({ pipeId: "123", title: "Deal", first: 5, after: "cursor1" }, ctx);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.includes('search: { title: "Deal" }'));
  assert(q.includes("first: 5"));
  assert(q.includes('after: "cursor1"'));
});

Deno.test("card-list: type/resource metadata", () => {
  assertEquals(cardList.type, "search");
  assertEquals(cardList.resource, "card");
});
