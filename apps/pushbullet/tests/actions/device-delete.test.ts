import { assertEquals } from "@std/assert";
import deviceDelete from "../../actions/device-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("device-delete: DELETEs /v2/devices/{iden} — the concrete example, not the terser Call line", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await deviceDelete.execute({ iden: "d1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/devices/d1");
  assertEquals(out.deleted, true);
});

Deno.test("device-delete: is declared idempotent", () => {
  assertEquals(deviceDelete.idempotent, true);
});
