import { assertEquals } from "@std/assert";
import action from "../../actions/business-unit-reviews-list-all.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("business-unit-reviews-list-all: first page has no pageToken, returns nextCursor", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        reviews: [{ id: "r1" }],
        nextPageToken: "MjAxMy0wNS0wM1QxMDowMzo0MS4wMDBa",
      },
    },
  ]);

  const out = await action.execute({ businessUnitId: "bu1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/business-units/bu1/all-reviews");
  assertEquals(queryOf(calls[0].url).pageToken, undefined);
  assertEquals(out.items[0].id, "r1");
  assertEquals(out.nextCursor, "MjAxMy0wNS0wM1QxMDowMzo0MS4wMDBa");
});

Deno.test("business-unit-reviews-list-all: passes pageToken through on a subsequent call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { reviews: [] } }]);
  const out = await action.execute({ businessUnitId: "bu1", pageToken: "cursor-1" }, ctx);
  assertEquals(queryOf(calls[0].url).pageToken, "cursor-1");
  assertEquals(out.nextCursor, undefined);
});
