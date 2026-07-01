import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-positioned-object.ts";

Deno.test("document-delete-positioned-object: emits deletePositionedObject", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1", objectId: "obj-9" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{ deletePositionedObject: { objectId: "obj-9" } }],
  });
});
