import { assertEquals } from "@std/assert";
import refundGet from "../../actions/refund-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("refund-get: fetches /refunds/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rfnd_1", status: "processed" } }]);
  const out = await refundGet.execute({ id: "rfnd_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/refunds/rfnd_1");
  assertEquals(out, { id: "rfnd_1", status: "processed" });
});
