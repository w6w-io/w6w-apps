import { assertEquals } from "@std/assert";
import action from "../../actions/business-unit-reviews-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("business-unit-reviews-list: forwards every documented filter", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { reviews: [{ id: "r1", stars: 5, consumer: { displayName: "John" } }] },
    },
  ]);

  const out = await action.execute(
    {
      businessUnitId: "bu1",
      stars: 5,
      language: "en",
      internalLocationId: "loc1",
      page: 1,
      perPage: 20,
      orderBy: "stars.desc",
      tagGroup: "Group",
      tagValue: "Value",
      responded: true,
      includeReportedReviews: false,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/business-units/bu1/reviews");
  const q = queryOf(calls[0].url);
  assertEquals(q.stars, "5");
  assertEquals(q.language, "en");
  assertEquals(q.internalLocationId, "loc1");
  assertEquals(q.page, "1");
  assertEquals(q.perPage, "20");
  assertEquals(q.orderBy, "stars.desc");
  assertEquals(q.tagGroup, "Group");
  assertEquals(q.tagValue, "Value");
  assertEquals(q.responded, "true");
  // `false` is a meaningful, documented value and must not be dropped like "unset".
  assertEquals(q.includeReportedReviews, "false");
  assertEquals(out.items[0].id, "r1");
});

Deno.test("business-unit-reviews-list: a missing reviews array becomes an empty items array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ businessUnitId: "bu1" }, ctx);
  assertEquals(out.items, []);
});
