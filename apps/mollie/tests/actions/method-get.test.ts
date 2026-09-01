import { assertEquals } from "@std/assert";
import methodGet from "../../actions/method-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("method-get: fetches /methods/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ideal", description: "iDEAL" } }]);
  const out = await methodGet.execute({ methodId: "ideal" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/methods/ideal");
  assertEquals(out, { id: "ideal", description: "iDEAL" });
});
