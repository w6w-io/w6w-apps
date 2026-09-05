import { assertEquals } from "@std/assert";
import { APP_ID, mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/get-record.ts";

Deno.test("get-record: GETs /v0/apps/{appId}/collections/{id}/{recordId}", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: "42", Name: "Ada" } }]);
  const result = await action.execute!({ collectionId: "c1", recordId: "42" }, ctx);
  assertEquals(pathOf(calls[0].url), `/v0/apps/${APP_ID}/collections/c1/42`);
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "42", Name: "Ada" });
});
