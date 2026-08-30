import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-delete.ts";

Deno.test("entry-delete: DELETEs /forms/{formId}/entries/{entryId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ formId: "42", entryId: "e1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries/e1");
  assertEquals(result, { deleted: true });
});

Deno.test("entry-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
