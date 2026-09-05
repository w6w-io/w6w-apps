import { assertEquals } from "@std/assert";
import auditEventList from "../../actions/audit-event-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("audit-event-list: GETs /audit-events/ filtered by user email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await auditEventList.execute({ userEmail: "a@example.com" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/audit-events/");
  assertEquals(queryOf(calls[0]).get("user_email"), "a@example.com");
});
