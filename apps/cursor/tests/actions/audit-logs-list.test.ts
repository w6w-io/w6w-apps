import { assertEquals } from "@std/assert";
import auditLogsList from "../../actions/audit-logs-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("audit-logs-list: joins eventTypes and users as comma-separated query values", async () => {
  const { ctx, calls } = mockCtx([
    { body: { events: [], pagination: {} } },
  ]);
  await auditLogsList.execute({
    startDate: 1,
    endDate: 2,
    eventTypes: ["login", "add_user"],
    users: "admin@co.com,dev@co.com",
    page: 1,
    pageSize: 50,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/teams/audit-logs");
  assertEquals(queryOf(calls[0].url), {
    startDate: "1",
    endDate: "2",
    eventTypes: "login,add_user",
    users: "admin@co.com,dev@co.com",
    page: "1",
    pageSize: "50",
  });
});

Deno.test("audit-logs-list: omits filters that were left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await auditLogsList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
