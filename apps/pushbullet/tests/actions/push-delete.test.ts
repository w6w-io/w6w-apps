import { assertEquals } from "@std/assert";
import pushDelete from "../../actions/push-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("push-delete: DELETEs /v2/pushes/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await pushDelete.execute({ iden: "p1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/pushes/p1");
  assertEquals(out.deleted, true);
});

Deno.test("push-delete: is declared idempotent", () => {
  assertEquals(pushDelete.idempotent, true);
});
