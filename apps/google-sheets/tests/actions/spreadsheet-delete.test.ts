import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/spreadsheet-delete.ts";

Deno.test("spreadsheet-delete: DELETE /drive/v3/files/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ spreadsheetId: "abc-123" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/drive/v3/files/abc-123");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
