import { assertEquals } from "@std/assert";
import deleteGamma from "../../actions/delete-gamma.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-gamma: DELETEs /gammas/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "deleted", gammaId: "g_1", message: "Gamma deleted." } },
  ]);
  const out = await deleteGamma.execute({ gammaId: "g_1" }, ctx) as { status: string };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1");
  assertEquals(out.status, "deleted");
});
