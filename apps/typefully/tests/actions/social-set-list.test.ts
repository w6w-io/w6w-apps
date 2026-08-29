import { assertEquals } from "@std/assert";
import socialSetList from "../../actions/social-set-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("social-set-list: fetches /v2/social-sets with limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, username: "acme" }]) }]);
  const out = await socialSetList.execute({ limit: 25, offset: 5 }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets");
  assertEquals(queryOf(calls[0].url), { limit: "25", offset: "5" });
  assertEquals(out.count, 1);
});

Deno.test("social-set-list: defaults are limit 10 / max 50, per the vendor's own default", () => {
  const limitParam = socialSetList.params?.find((p) => p.key === "limit");
  assertEquals(limitParam?.default, 10);
  assertEquals(limitParam?.validation?.max, 50);
});
