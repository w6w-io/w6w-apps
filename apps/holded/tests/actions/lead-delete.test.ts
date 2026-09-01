import { assertEquals } from "@std/assert";
import leadDelete from "../../actions/lead-delete.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-delete: metadata — idempotent", () => {
  assertEquals(leadDelete.type, "perform");
  assertEquals(leadDelete.idempotent, true);
});

Deno.test("lead-delete: DELETE /leads/{leadId}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: writeResult("Successfully deleted", "l1"),
  }]);
  const result = asMutation(await leadDelete.execute({ leadId: "l1" }, ctx));
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1");
  assertEquals(result.info, "Successfully deleted");
});
