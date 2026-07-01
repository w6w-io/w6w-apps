import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-insert-table.ts";

Deno.test("document-insert-table: emits insertTable with rows/columns and default location", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ documentURL: "d-1", rows: 3, columns: 4 }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      insertTable: {
        rows: 3,
        columns: 4,
        endOfSegmentLocation: { segmentId: "" },
      },
    }],
  });
});
