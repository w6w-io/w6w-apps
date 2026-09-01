import { assertEquals } from "@std/assert";
import leadDateUpdate from "../../actions/lead-date-update.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-date-update: metadata — idempotent", () => {
  assertEquals(leadDateUpdate.type, "perform");
  assertEquals(leadDateUpdate.idempotent, true);
});

Deno.test("lead-date-update: PUT /leads/{leadId}/dates with {date}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "l1") }]);
  const result = asMutation(
    await leadDateUpdate.execute({ leadId: "l1", date: 1521646788 }, ctx),
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1/dates");
  assertEquals(JSON.parse(calls[0].body!), { date: 1521646788 });
  assertEquals(result.info, "Updated");
});
