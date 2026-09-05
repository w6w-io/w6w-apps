import { assertEquals } from "@std/assert";
import { APP_ID, mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/delete-record.ts";

Deno.test("delete-record: DELETEs /v0/apps/{appId}/collections/{id}/{recordId}", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ collectionId: "c1", recordId: "42" }, ctx);
  assertEquals(pathOf(calls[0].url), `/v0/apps/${APP_ID}/collections/c1/42`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});

Deno.test("delete-record: normalizes a 204 No Content the same way", async () => {
  const { ctx } = mockConnectedCtx([{ status: 204 }]);
  const result = await action.execute!({ collectionId: "c1", recordId: "42" }, ctx);
  assertEquals(result, { success: true });
});
