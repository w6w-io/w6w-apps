import { assertEquals } from "@std/assert";
import disputeGet from "../../actions/dispute-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dispute-get: fetches /disputes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "disp_1", status: "open" } }]);
  const out = await disputeGet.execute({ id: "disp_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/disputes/disp_1");
  assertEquals(out, { id: "disp_1", status: "open" });
});
