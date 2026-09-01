import { assertEquals } from "@std/assert";
import disputeAccept from "../../actions/dispute-accept.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dispute-accept: posts to /disputes/{id}/accept — irreversible, so no body needed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "disp_1", status: "lost" } }]);
  const out = await disputeAccept.execute({ id: "disp_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/disputes/disp_1/accept");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "disp_1", status: "lost" });
});
