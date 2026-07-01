import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-insert-page-break.ts";

Deno.test("document-insert-page-break: emits insertPageBreak at end of body by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{ insertPageBreak: { endOfSegmentLocation: { segmentId: "" } } }],
  });
});
