import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-header.ts";

Deno.test("document-delete-header: emits deleteHeader with the headerId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1", headerId: "h-2" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{ deleteHeader: { headerId: "h-2" } }],
  });
});
