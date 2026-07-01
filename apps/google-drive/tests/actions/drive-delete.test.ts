import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/drive-delete.ts";

Deno.test("drive-delete: DELETEs /drives/{id} and returns success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ driveId: "drv-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/drive/v3/drives/drv-1");
  assertEquals(result, { id: "drv-1", success: true });
});
