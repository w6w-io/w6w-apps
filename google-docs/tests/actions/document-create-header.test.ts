import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create-header.ts";

Deno.test("document-create-header: emits DEFAULT createHeader with sectionBreakLocation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1", index: 3 }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      createHeader: {
        type: "DEFAULT",
        sectionBreakLocation: { segmentId: "", index: 3 },
      },
    }],
  });
});
