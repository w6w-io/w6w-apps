import { assertEquals } from "@std/assert";
import { APP_ID, mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/update-record.ts";

Deno.test("update-record: PUTs fields to /v0/apps/{appId}/collections/{id}/{recordId}", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: "42" } }]);
  const result = await action.execute!(
    { collectionId: "c1", recordId: "42", fields: { Score: 20 } },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `/v0/apps/${APP_ID}/collections/c1/42`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { Score: 20 });
  assertEquals(result, { id: "42" });
});
