import { assertEquals } from "@std/assert";
import monitorDelete from "../../actions/monitor-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("monitor-delete: DELETEs /robots/{robotId}/monitors/{monitorId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: errorBody(200, "success") }]);
  const out = await monitorDelete.execute({ robotId: "r1", monitorId: "m1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/monitors/m1");
  assertEquals(out, { deleted: true });
});

Deno.test('monitor-delete: is declared idempotent — retrying converges on "gone"', () => {
  assertEquals(monitorDelete.idempotent, true);
});
