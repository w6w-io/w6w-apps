import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-footer.ts";

Deno.test("document-delete-footer: emits deleteFooter with the footerId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1", footerId: "f-2" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{ deleteFooter: { footerId: "f-2" } }],
  });
});
