import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/import-status-get.ts";

Deno.test("import-status-get: GETs /forms/{formId}/import-status/{importId}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { Id: "imp1", Status: "Completed", SuccessfulEntries: 10, TotalEntries: 10 } },
  ]);
  const result = await action.execute({ formId: "42", importId: "imp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/import-status/imp1");
  assertEquals(result, {
    Id: "imp1",
    Status: "Completed",
    SuccessfulEntries: 10,
    TotalEntries: 10,
  });
});
