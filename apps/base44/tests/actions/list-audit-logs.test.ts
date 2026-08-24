import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-audit-logs.ts";
import { mockConnectedCtx, mockCtx, pathOf, WORKSPACE_ID } from "../_helpers.ts";

const PAGE = {
  events: [{
    timestamp: "2026-01-15T09:23:41Z",
    event_type: "auth.login",
    status: "success",
    metadata: {},
  }],
  pagination: { total: 1, next_cursor: null },
};

Deno.test("list-audit-logs: POSTs to /list and maps events + pagination", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  const result = await action.execute({}, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/api/v1/audit-logs/${WORKSPACE_ID}/list`);
  assertEquals(result, { events: PAGE.events, total: 1, nextCursor: undefined });
});

Deno.test("list-audit-logs: sends the documented filter fields in the body", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({
    eventTypes: ["auth.login", "app.entity.created"],
    userEmail: "jane@acme.com",
    status: "failure",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
    appId: "app1",
    limit: 100,
    cursor: "cur1",
    order: "ASC",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    event_types: ["auth.login", "app.entity.created"],
    user_email: "jane@acme.com",
    status: "failure",
    start_date: "2026-01-01T00:00:00Z",
    end_date: "2026-02-01T00:00:00Z",
    app_id: "app1",
    limit: 100,
    cursor: "cur1",
    order: "ASC",
  });
});

Deno.test("list-audit-logs: an empty event-type list is omitted, not sent as []", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({ eventTypes: [] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("event_types" in body, false);
});

Deno.test("list-audit-logs: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workspace id");
});
