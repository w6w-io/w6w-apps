import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/drive-get.ts";

Deno.test("drive-get: GETs /drives/{id}", async () => {
  const body = { id: "drv-1", name: "Team" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ driveId: "drv-1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/drive/v3/drives/drv-1");
  assertEquals(result, body);
});
