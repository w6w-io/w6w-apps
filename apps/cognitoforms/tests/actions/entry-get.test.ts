import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-get.ts";

Deno.test("entry-get: GETs /forms/{formId}/entries/{entryId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "e1", Email: "jane@example.com" } }]);
  const result = await action.execute({ formId: "42", entryId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries/e1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { entry: { Id: "e1", Email: "jane@example.com" } });
});
