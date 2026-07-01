import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/drive-update.ts";

Deno.test("drive-update: PATCHes /drives/{id} with supplied fields only", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "drv-1", name: "Renamed" } }]);
  await action.execute!({ driveId: "drv-1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/drive/v3/drives/drv-1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.name, "Renamed");
  // colorRgb was not provided, so it must not appear in the body.
  assertEquals("colorRgb" in sent, false);
});
