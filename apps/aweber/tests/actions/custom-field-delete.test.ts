import { assertEquals } from "@std/assert";
import customFieldDelete from "../../actions/custom-field-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-delete: deletes by id and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await customFieldDelete.execute(
    { accountId: "1", listId: "2", customFieldId: "3" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/custom_fields/3");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 200 });
});
