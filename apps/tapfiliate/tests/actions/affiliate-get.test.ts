import { assertEquals } from "@std/assert";
import affiliateGet from "../../actions/affiliate-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-get: fetches by affiliate id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "janejameson", firstname: "Jane" } }]);
  const out = await affiliateGet.execute({ affiliateId: "janejameson" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/");
  assertEquals(out, { id: "janejameson", firstname: "Jane" });
});
