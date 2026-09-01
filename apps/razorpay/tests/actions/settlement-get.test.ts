import { assertEquals } from "@std/assert";
import settlementGet from "../../actions/settlement-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("settlement-get: fetches /settlements/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "setl_1", utr: "UTR123" } }]);
  const out = await settlementGet.execute({ id: "setl_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/settlements/setl_1");
  assertEquals(out, { id: "setl_1", utr: "UTR123" });
});
