import { assertEquals } from "@std/assert";
import draftList from "../../actions/draft-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("draft-list: fetches the social set's drafts with filters and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, status: "draft" }]) }]);
  await draftList.execute({
    socialSetId: 4,
    status: "draft",
    tag: "marketing, product",
    orderBy: "-created_at",
    limit: 25,
    offset: 0,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts");
  const q = queryOf(calls[0].url);
  assertEquals(q.status, "draft");
  assertEquals(q.order_by, "-created_at");
  assertEquals(q.limit, "25");
  assertEquals(queryAllOf(calls[0].url, "tag"), ["marketing", "product"]);
});

Deno.test("draft-list: omits filters that were never set", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await draftList.execute({ socialSetId: 4 }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals("status" in q, false);
  assertEquals("tag" in q, false);
});

Deno.test("draft-list: default order is -updated_at, matching the vendor's own default", () => {
  const orderBy = draftList.params?.find((p) => p.key === "orderBy");
  assertEquals(orderBy?.default, "-updated_at");
});
