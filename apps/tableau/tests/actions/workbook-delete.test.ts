import { assertEquals, assertRejects } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/workbook-delete.ts";

Deno.test("workbook-delete: refuses without confirmation", async () => {
  const { ctx, calls } = mockCtx([], { display: DEFAULT_DISPLAY });
  await assertRejects(
    () => Promise.resolve(action.execute!({ workbookId: "w1" }, ctx)),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("workbook-delete: deletes when confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: DEFAULT_DISPLAY });
  const result = await action.execute!({ workbookId: "w1", confirm: true }, ctx);
  assertEquals(result, { workbookId: "w1", deleted: true });
  assertEquals(calls[0].method, "DELETE");
});
