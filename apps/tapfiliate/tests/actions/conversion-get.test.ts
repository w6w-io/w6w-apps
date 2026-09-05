import { assertEquals } from "@std/assert";
import conversionGet from "../../actions/conversion-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversion-get: fetches by numeric id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, external_id: "ORD123", amount: 550 } }]);
  const out = await conversionGet.execute({ conversionId: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/conversions/1/");
  assertEquals(out, { id: 1, external_id: "ORD123", amount: 550 });
});
