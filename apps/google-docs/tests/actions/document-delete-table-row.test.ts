import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-table-row.ts";

Deno.test("document-delete-table-row: emits deleteTableRow with tableCellLocation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", index: 4, rowIndex: 1, columnIndex: 0 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      deleteTableRow: {
        tableCellLocation: {
          rowIndex: 1,
          columnIndex: 0,
          tableStartLocation: { segmentId: "", index: 4 },
        },
      },
    }],
  });
});
