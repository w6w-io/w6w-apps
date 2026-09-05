import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardFind from "../../actions/card-find.ts";

Deno.test("card-find: finds cards by an exact field value", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        findCards: {
          edges: [{ node: { id: "1", title: "Deal" } }],
          pageInfo: { endCursor: null },
          totalCount: 1,
        },
      },
    },
  }]);
  const out = await cardFind.execute(
    { pipeId: "123", fieldId: "external_id", fieldValue: "ext-42" },
    ctx,
  ) as { cards: unknown[] };
  assertEquals(out.cards.length, 1);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ findCards(pipeId: 123,"));
  assert(q.includes('search: { fieldId: "external_id", fieldValue: "ext-42" }'));
});

Deno.test("card-find: type/resource metadata", () => {
  assertEquals(cardFind.type, "search");
  assertEquals(cardFind.resource, "card");
});
